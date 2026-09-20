import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getCache } from './cache';
import { getDb, initDb } from './db';
import { rateLimit } from './ratelimit';

// Transporter cache
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || '465', 10);
  const user = process.env.EMAIL_SERVER_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: true
      }
    });
    return transporter;
  }
  return null;
}

/**
 * Generate a 6-digit cryptographically secure numeric OTP
 */
export function generateNumericOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send 6-Digit Email OTP to recipient with Dual-Storage (Postgres + Redis)
 */
export async function sendEmailOTP(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Rate limit: 1 OTP request per email per 30 seconds
  const rateKey = `rate:email-otp:${cleanEmail}`;
  const rateCheck = await rateLimit(rateKey, 1, 30);
  if (!rateCheck.success) {
    return {
      success: false,
      message: 'Please wait 30 seconds before requesting another OTP.'
    };
  }

  const otp = generateNumericOTP();
  const ttlSeconds = 600; // 10 minutes validity

  // 1. Persistent Storage: PostgreSQL (Immune to Redis restarts / cold starts)
  try {
    await initDb();
    const db = getDb();
    await db.query(
      `INSERT INTO email_otps (email, otp, attempts, expires_at, used_at)
       VALUES ($1, $2, 0, NOW() + INTERVAL '10 minutes', NULL)
       ON CONFLICT (email) DO UPDATE 
       SET otp = $2, attempts = 0, expires_at = NOW() + INTERVAL '10 minutes', used_at = NULL, created_at = CURRENT_TIMESTAMP`,
      [cleanEmail, otp]
    );
  } catch (dbErr) {
    console.warn('[Email OTP DB Save Warning]:', dbErr);
  }

  // 2. In-Memory Cache: Redis
  try {
    const { redis } = getCache();
    if (redis) {
      const otpKey = `otp:email:${cleanEmail}`;
      const attemptsKey = `otp:attempts:${cleanEmail}`;
      await redis.setex(otpKey, ttlSeconds, otp);
      await redis.setex(attemptsKey, ttlSeconds, '0');
    }
  } catch (redisErr) {
    console.warn('[Email OTP Redis Save Warning]:', redisErr);
  }

  const fromAddress = process.env.EMAIL_FROM || '"Kanban Cloud Security" <no-reply@kanbancloud.app>';
  const mailTransporter = getTransporter();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #38bdf8; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Kanban Cloud</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Security Verification Code</p>
      </div>
      
      <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #334155;">
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 0; margin-bottom: 12px;">Your 6-digit verification code is:</p>
        <div style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; background-color: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #059669; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0; margin-top: 12px;">Valid for 10 minutes. Do not share this code with anyone.</p>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
        If you did not request this verification code, please ignore this email.
      </p>
    </div>
  `;

  try {
    if (mailTransporter) {
      await mailTransporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: `${otp} is your Kanban Cloud Verification Code`,
        text: `Your Kanban Cloud verification code is: ${otp} (valid for 10 minutes).`,
        html: htmlContent
      });
      console.log(`[Email OTP] Sent to ${cleanEmail}`);
    } else if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [cleanEmail],
          subject: `${otp} is your Kanban Cloud Verification Code`,
          html: htmlContent
        })
      });
      console.log(`[Email OTP via Resend] Sent to ${cleanEmail}`);
    } else {
      console.log('\n==================================================');
      console.log(`[EMAIL OTP DEV MODE] Recipient: ${cleanEmail}`);
      console.log(`[EMAIL OTP CODE] ----> ${otp} <----`);
      console.log('==================================================\n');
    }

    return { success: true, message: 'OTP sent successfully to your email.' };
  } catch (err: any) {
    console.error('[Email OTP Error]', err);
    return { success: false, message: 'Failed to deliver OTP email. Please try again.' };
  }
}

/**
 * Verify 6-Digit Email OTP with Dual-Storage and Grace-Period Re-entry Protection
 */
export async function verifyEmailOTP(email: string, code: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, message: 'Invalid 6-digit OTP code format.' };
  }

  let storedOTP: string | null = null;
  let attempts = 0;
  let isExpired = false;
  let isRecentlyUsed = false;

  // 1. Check PostgreSQL first (persistent store)
  try {
    await initDb();
    const db = getDb();
    const res = await db.query(
      `SELECT otp, attempts, 
              (expires_at < NOW()) AS is_expired,
              (used_at IS NOT NULL AND used_at > NOW() - INTERVAL '60 seconds') AS is_recently_used,
              (used_at IS NOT NULL AND used_at <= NOW() - INTERVAL '60 seconds') AS is_old_used
       FROM email_otps 
       WHERE LOWER(TRIM(email)) = $1`,
      [cleanEmail]
    );

    if (res.rows.length > 0) {
      if (res.rows[0].is_old_used) {
        return { success: false, message: 'OTP has already been used. Please request a new OTP.' };
      }
      storedOTP = res.rows[0].otp;
      attempts = res.rows[0].attempts || 0;
      isExpired = Boolean(res.rows[0].is_expired);
      isRecentlyUsed = Boolean(res.rows[0].is_recently_used);
    }
  } catch (dbErr) {
    console.warn('[Email OTP DB Read Warning]:', dbErr);
  }

  // 2. Check Redis fallback if not found in DB
  if (!storedOTP) {
    try {
      const { redis } = getCache();
      if (redis) {
        const otpKey = `otp:email:${cleanEmail}`;
        const attemptsKey = `otp:attempts:${cleanEmail}`;
        storedOTP = await redis.get(otpKey);
        const attemptsStr = await redis.get(attemptsKey);
        if (attemptsStr) attempts = parseInt(attemptsStr, 10);
      }
    } catch (redisErr) {
      console.warn('[Email OTP Redis Read Warning]:', redisErr);
    }
  }

  if (!storedOTP || isExpired) {
    return { success: false, message: 'OTP has expired or was not requested. Please click Resend OTP.' };
  }

  if (attempts >= 5) {
    return { success: false, message: 'Maximum verification attempts exceeded. Please click Resend OTP.' };
  }

  if (storedOTP !== cleanCode) {
    try {
      const db = getDb();
      await db.query('UPDATE email_otps SET attempts = attempts + 1 WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
      const { redis } = getCache();
      if (redis) await redis.incr(`otp:attempts:${cleanEmail}`);
    } catch {}

    const remaining = 4 - attempts;
    return {
      success: false,
      message: `Incorrect OTP code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'OTP invalidated.'}`
    };
  }

  // If recently used within 60 seconds grace period (handles NextAuth multi-invocation):
  if (isRecentlyUsed) {
    return { success: true, message: 'OTP verified successfully.' };
  }

  // Mark as used in DB with timestamp
  try {
    const db = getDb();
    await db.query('UPDATE email_otps SET used_at = NOW() WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    const { redis } = getCache();
    if (redis) {
      await redis.del(`otp:email:${cleanEmail}`);
      await redis.del(`otp:attempts:${cleanEmail}`);
    }
  } catch (markErr) {
    console.warn('[Email OTP Mark Used Warning]:', markErr);
  }

  return { success: true, message: 'OTP verified successfully.' };
}
