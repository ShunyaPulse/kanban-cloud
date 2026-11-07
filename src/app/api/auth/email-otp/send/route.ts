import { NextResponse } from 'next/server';
import { sendEmailOTP } from '@/lib/email-otp';
import { getClientIp, getClientSubnet, rateLimit } from '@/lib/ratelimit';
import { verifyCloudflareTurnstile } from '@/lib/bot-shield';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose, turnstileToken, hp_website } = body;

    // Layer 1: Honeypot silent tarpit
    if (hp_website) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: true, message: 'OTP sent successfully to your email.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const ip = getClientIp(req.headers);
    const subnet = getClientSubnet(ip);

    // Short-term burst protection: Max 2 OTP sends per 10 minutes per IP
    const burstIpCheck = await rateLimit(`rate:email-otp-burst-ip:${ip}`, 2, 600);
    if (!burstIpCheck.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts from this IP address. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Short-term burst protection: Max 4 OTP sends per 10 minutes per subnet
    const burstSubnetCheck = await rateLimit(`rate:email-otp-burst-subnet:${subnet}`, 4, 600);
    if (!burstSubnetCheck.success) {
      return NextResponse.json(
        { error: 'Too many verification requests from this network. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Daily limit: Max 5 OTP sends per 24 hours per email
    const dailyEmailCheck = await rateLimit(`rate:email-otp-daily:${cleanEmail}`, 5, 86400);
    if (!dailyEmailCheck.success) {
      return NextResponse.json(
        { error: 'Daily verification limit reached for this email. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // General IP Rate limit: Max 5 OTP requests per IP per 5 minutes
    const ipCheck = await rateLimit(`rate:email-otp-ip:${ip}`, 5, 300);
    if (!ipCheck.success) {
      return NextResponse.json(
        { error: 'Too many OTP requests from this IP. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Verify Cloudflare Turnstile for Sign Up OTP requests (validates tokens and stops bot spam)
    if (purpose === 'signup' && process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Please complete the security verification before requesting a code.' },
          { status: 403 }
        );
      }
      const isHuman = await verifyCloudflareTurnstile(turnstileToken, ip);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'Security verification failed. Please complete the captcha and try again.' },
          { status: 403 }
        );
      }
    }

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
