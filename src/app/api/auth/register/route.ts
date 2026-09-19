import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { rateLimit, getClientIp, getClientSubnet } from '@/lib/ratelimit';
import { verifyShieldSolution, verifyCloudflareTurnstile } from '@/lib/bot-shield';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const subnet = getClientSubnet(ip);

    // Parse payload
    const body = await req.json();
    const { name, email, password, emailOtp, hp_website, shield, turnstileToken } = body;

    // Layer 1: Honeypot trap (if a bot auto-fills hidden fields, reject silently)
    if (hp_website) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Layer 2: Cloudflare Turnstile Verification (if enabled)
    if (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY && turnstileToken) {
      const isHuman = await verifyCloudflareTurnstile(turnstileToken, ip);
      if (!isHuman) {
        return NextResponse.json(
          { error: "Security check failed. Please refresh and try again." },
          { status: 403 }
        );
      }
    }

    // Layer 3: Anti-Bot Proof-of-Work Challenge (Stops Python, Curl, Headless scripts)
    if (shield) {
      if (
        typeof shield.salt !== "string" ||
        typeof shield.timestamp !== "number" ||
        typeof shield.targetDifficulty !== "number" ||
        !Number.isInteger(shield.targetDifficulty) ||
        shield.targetDifficulty < 1 ||
        shield.targetDifficulty > 8 ||
        typeof shield.signature !== "string" ||
        typeof shield.solution !== "string"
      ) {
        return NextResponse.json(
          { error: "Browser security challenge failed. Please refresh the page." },
          { status: 403 }
        );
      }

      const isValidShield = verifyShieldSolution(
        shield.salt,
        shield.timestamp,
        shield.targetDifficulty,
        shield.signature,
        shield.solution
      );
      if (!isValidShield) {
        return NextResponse.json(
          { error: "Browser security challenge failed. Please refresh the page." },
          { status: 403 }
        );
      }
    } else if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      // If Turnstile is not active and no shield is sent, reject direct API callers
      return NextResponse.json(
        { error: "Security verification missing. Please use a standard browser." },
        { status: 403 }
      );
    }

    // Layer 4: Device Cookie Rate Limit (Stops VPN / Proxy rotation from the same browser)
    const cookiesHeader = req.headers.get("cookie") || "";
    const devIdMatch = cookiesHeader.match(/__kc_dev_id=([^;]+)/);
    const deviceId = devIdMatch ? devIdMatch[1] : null;

    if (deviceId) {
      const devLimit = await rateLimit(`rate:register:dev:${deviceId}`, 3, 1800); // 3 per 30 mins
      if (!devLimit.success) {
        const minutes = Math.ceil(devLimit.resetInSeconds / 60);
        return NextResponse.json(
          { error: `Too many sign-up attempts from this device. Please try again in ${minutes} minute(s).` },
          { status: 429 }
        );
      }
    }

    // Layer 5: Subnet / Tower Throttling (Stops Mobile Flight Mode dynamic IP rotation)
    const subnetLimit = await rateLimit(`rate:register:subnet:${subnet}`, 4, 900); // 4 per 15 mins per tower subnet
    if (!subnetLimit.success) {
      const minutes = Math.ceil(subnetLimit.resetInSeconds / 60);
      return NextResponse.json(
        { error: `High sign-up activity detected from your network provider. Please try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    // Layer 6: Exact IP Rate Limit (Max 3 per 15 minutes)
    const ipLimit = await rateLimit(`rate:register:ip:${ip}`, 3, 900);
    if (!ipLimit.success) {
      const minutes = Math.ceil(ipLimit.resetInSeconds / 60);
      return NextResponse.json(
        { error: `Too many sign-up attempts from your IP. Please try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    // Layer 7: CSRF / Origin Verification
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const host = req.headers.get('host');
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 72 characters' },
        { status: 400 }
      );
    }

    const commonPasswords = ["password", "12345678", "qwertyuiop", "11111111", "kanbancloud"];
    if (commonPasswords.includes(password.toLowerCase()) || password.toLowerCase() === cleanEmail) {
      return NextResponse.json({ error: "Password is too weak or common" }, { status: 400 });
    }

    // Sanitize Name (prevent XSS) — encode HTML special chars instead of stripping tags,
    // which fixes incomplete-multi-character-sanitization (CodeQL js/incomplete-multi-character-sanitization)
    const rawName = (name || cleanEmail.split('@')[0]).trim().slice(0, 50);
    const cleanName = rawName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    await initDb();
    const db = getDb();

    // Check if user exists (case-insensitive)
    const existing = await db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
    }

    // Layer 8: Email OTP Verification (guarantees real inbox ownership)
    if (!emailOtp || typeof emailOtp !== 'string' || emailOtp.trim().length !== 6) {
      return NextResponse.json({ error: 'Please enter the 6-digit verification code sent to your email.' }, { status: 400 });
    }

    const { verifyEmailOTP } = await import('@/lib/email-otp');
    const otpCheck = await verifyEmailOTP(cleanEmail, emailOtp.trim());
    if (!otpCheck.success) {
      return NextResponse.json({ error: otpCheck.message }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (name, email, password, "emailVerified") VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, name, email',
      [cleanName, cleanEmail, hashedPassword]
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Registration error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
