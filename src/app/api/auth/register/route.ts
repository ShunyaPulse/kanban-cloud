import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
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
