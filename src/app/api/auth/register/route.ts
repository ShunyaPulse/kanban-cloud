import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);

    // Rate Limit: Max 5 registrations per IP per 15 minutes (900 seconds)
    const { success, resetInSeconds } = await rateLimit(`rate:register:${ip}`, 5, 900);
    if (!success) {
      const minutes = Math.ceil(resetInSeconds / 60);
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please try again in ${minutes} minute(s).` },
        { status: 429 }
      );
    }

    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    await initDb();
    const db = getDb();

    // Check if user exists (case-insensitive)
    const existing = await db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name || email.split('@')[0], email, hashedPassword]
    );

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Registration error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
