import { NextResponse } from 'next/server';
import { verifyEmailOTP } from '@/lib/email-otp';
import { getClientIp, rateLimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP code are required' }, { status: 400 });
    }

    const ip = getClientIp(req.headers);
    const ipCheck = await rateLimit(`rate:email-otp-verify-ip:${ip}`, 10, 300);
    if (!ipCheck.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait.' },
        { status: 429 }
      );
    }

    const result = await verifyEmailOTP(email, otp);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (err: any) {
    console.error('[Email OTP Verify API Error]', err);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
