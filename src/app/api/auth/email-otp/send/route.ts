import { NextResponse } from 'next/server';
import { sendEmailOTP } from '@/lib/email-otp';
import { getClientIp, rateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists when requesting OTP for Sign Up
    if (purpose === 'signup') {
      const { getDb, initDb } = await import('@/lib/db');
      await initDb();
      const db = getDb();
      const existing = await db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }
    }

    const ip = getClientIp(req.headers);
    
    // IP Rate limit: Max 5 OTP requests per IP per 5 minutes
    const ipCheck = await rateLimit(`rate:email-otp-ip:${ip}`, 5, 300);
    if (!ipCheck.success) {
      return NextResponse.json(
        { error: 'Too many OTP requests from this IP. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    const result = await sendEmailOTP(email);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[Email OTP Send API Error]', err);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
