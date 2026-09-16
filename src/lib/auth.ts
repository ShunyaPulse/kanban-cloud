import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { getDb, initDb } from "./db";
import { getCache } from "./cache";
import { rateLimit, getClientIp } from "./ratelimit";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // @ts-ignore
  adapter: PostgresAdapter(getDb()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email) {
          return null;
        }

        const ip = getClientIp(req?.headers as any);
        const cleanEmail = credentials.email.trim().toLowerCase();
        const emailOtp = (credentials as any)?.emailOtp?.trim();

        // 1. Email OTP Login Flow
        if (emailOtp) {
          const { verifyEmailOTP } = await import("./email-otp");
          const otpResult = await verifyEmailOTP(cleanEmail, emailOtp);
          if (!otpResult.success) {
            throw new Error(otpResult.message);
          }

          await initDb();
          const db = getDb();
          let res = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
          let user = res.rows[0];

          if (!user) {
            const userName = cleanEmail.split('@')[0];
            const insertRes = await db.query(
              'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
              [userName, cleanEmail]
            );
            user = insertRes.rows[0];
          }

          const { redis: r } = getCache();
          if (r) r.del(`rate:login:failed:${cleanEmail}`).catch(() => {});

          const needs2FA = Boolean(user.two_factor_enabled && user.two_factor_secret);

          return {
            id: user.id.toString(),
            name: user.name || cleanEmail.split('@')[0],
            email: user.email,
            image: user.image,
            is2FAVerified: !needs2FA,
          };
        }

        if (!credentials?.password) {
          return null;
        }

        // Check Account Lockout status
        const { redis } = getCache();
        if (redis) {
          try {
            const failedCount = await redis.get(`rate:login:failed:${cleanEmail}`);
            if (failedCount && parseInt(failedCount, 10) >= 5) {
              const ttl = await redis.ttl(`rate:login:failed:${cleanEmail}`);
              const minutes = Math.max(1, Math.ceil(ttl / 60));
              throw new Error(`Account temporarily locked. Try again in ${minutes} minute(s).`);
            }
          } catch (lockoutErr: any) {
            if (lockoutErr.message?.includes('locked')) throw lockoutErr;
          }
        }

        // Rate Limit: Max 10 login attempts per IP per 5 minutes
        const ipLimit = await rateLimit(`rate:login:ip:${ip}`, 10, 300);
        if (!ipLimit.success) {
          const minutes = Math.ceil(ipLimit.resetInSeconds / 60);
          throw new Error(`Too many login attempts. Please try again in ${minutes} minute(s).`);
        }

        // Rate Limit: Max 5 login attempts per account per 5 minutes
        const emailLimit = await rateLimit(`rate:login:email:${cleanEmail}`, 5, 300);
        if (!emailLimit.success) {
          const minutes = Math.ceil(emailLimit.resetInSeconds / 60);
          throw new Error(`Too many attempts for this account. Please try again in ${minutes} minute(s).`);
        }
        const db = getDb();
        const res = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
        const user = res.rows[0];

        // Timing-attack defense: always run bcrypt comparison to make response times identical
        const dummyHash = "$2a$10$wE9s4Wk8hYJ7JqBqT.1gI.yZ8s1s2s3s4s5s6s7s8s9s0s1s2s3s4";
        const passwordToCompare = user?.password || dummyHash;
        const isValid = await bcrypt.compare(credentials.password, passwordToCompare);

        if (!user || !user.password || !isValid) {
          // Increment consecutive failed password counter
          if (redis) {
            try {
              const fails = await redis.incr(`rate:login:failed:${cleanEmail}`);
              if (fails === 1) await redis.expire(`rate:login:failed:${cleanEmail}`, 900); // 15 mins
              if (fails >= 5) {
                throw new Error("Account temporarily locked for 15 minutes due to multiple failed attempts.");
              }
            } catch (failErr: any) {
              if (failErr.message?.includes('locked')) throw failErr;
            }
          }
          return null;
        }

        // Two-Factor Authentication Check
        if (user.two_factor_enabled && user.two_factor_secret) {
          const rawTotp = (credentials as any)?.totpCode?.trim();
          const totpCode = (rawTotp && rawTotp !== "undefined" && rawTotp !== "null") ? rawTotp : "";

          if (!totpCode || totpCode.length !== 6) {
            throw new Error("2FA_REQUIRED");
          }

          const { verifyTOTP } = await import("./totp");
          const isTotpValid = verifyTOTP(user.two_factor_secret, totpCode);
          if (!isTotpValid) {
            throw new Error("Invalid 2FA code. Please check your Authenticator app.");
          }
        }

        // Reset failed password counter on successful authentication
        if (redis) {
          redis.del(`rate:login:failed:${cleanEmail}`).catch(() => {});
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          is2FAVerified: true,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days session expiration
    updateAge: 24 * 60 * 60,   // Rotate token every 24 hours
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).needs2FA = !!token.needs2FA;
      }
      return session;
    },
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        token.sub = user.id.toString();
        if ((user as any).is2FAVerified) {
          token.is2FAVerified = true;
        }
      }

      if (trigger === "update" && updateData?.verified2FA) {
        token.is2FAVerified = true;
      }

      if (token.email) {
        try {
          const db = getDb();
          const res = await db.query(
            "SELECT two_factor_enabled FROM users WHERE LOWER(TRIM(email)) = $1",
            [token.email.toLowerCase().trim()]
          );
          const dbUser = res.rows[0];
          if (dbUser?.two_factor_enabled && !token.is2FAVerified) {
            token.needs2FA = true;
          } else {
            token.needs2FA = false;
          }
        } catch (err) {
          // Ignore DB transient check errors
        }
      }

      return token;
    }
  }
};
