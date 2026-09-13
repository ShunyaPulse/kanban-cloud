import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { getDb } from "./db";
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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const ip = getClientIp(req?.headers as any);
        const cleanEmail = credentials.email.trim().toLowerCase();

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

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Attach user ID to session
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id.toString();
      }
      return token;
    }
  }
};
