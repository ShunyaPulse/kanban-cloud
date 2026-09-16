import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCache } from '@/lib/cache';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawUserId = (session.user as any).id;
    const userId = parseInt(rawUserId, 10);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const boardId = `user-board-${userId}`;

    // Read Rate Limit: Max 120 reads per minute per user
    const { rateLimit } = await import('@/lib/ratelimit');
    const readLimit = await rateLimit(`rate:board:read:${userId}`, 120, 60);
    if (!readLimit.success) {
      return NextResponse.json({ error: 'Too many read requests. Please slow down.' }, { status: 429 });
    }

    await initDb();
    
    // Try Cache First
    const { redis, cacheEnabled } = getCache();
    if (cacheEnabled && redis) {
      try {
        const cachedData = await redis.get(`board:${boardId}`);
        if (cachedData) {
          return NextResponse.json(JSON.parse(cachedData));
        }
      } catch (e) {
        console.warn('Cache read failed, falling back to DB');
      }
    }

    // Fallback to DB
    const db = getDb();
    const result = await db.query('SELECT data FROM boards WHERE id = $1 AND user_id = $2', [boardId, userId]);
    
    if (result.rows.length > 0) {
      const data = result.rows[0].data;
      // Sync cache
      if (cacheEnabled && redis) {
        redis.set(`board:${boardId}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
      }
      return NextResponse.json(data);
    }

    // Initial state if empty
    return NextResponse.json({ columns: [] });
  } catch (error) {
    console.error('Failed to GET board', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawUserId = (session.user as any).id;
    const userId = parseInt(rawUserId, 10);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const boardId = `user-board-${userId}`;

    // Rate Limit: Max 40 board saves per minute per user to prevent DB flood
    const { rateLimit } = await import('@/lib/ratelimit');
    const saveLimit = await rateLimit(`rate:board:save:${userId}`, 40, 60);
    if (!saveLimit.success) {
      return NextResponse.json({ error: 'Too many updates. Please slow down.' }, { status: 429 });
    }

    // CSRF / Origin Verification
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const host = req.headers.get('host');
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const bodyText = await req.text();
    // Payload Size Limit: Max 1MB
    if (bodyText.length > 1024 * 1024) {
      return NextResponse.json({ error: 'Payload too large (max 1MB)' }, { status: 413 });
    }

    const data = JSON.parse(bodyText);
    
    // Schema Structure & Stored XSS Guard
    if (!Array.isArray(data) || data.length > 20) {
      return NextResponse.json({ error: 'Invalid board schema format' }, { status: 400 });
    }

    // Sanitize column and card string fields against stored XSS
    const sanitizedData = data.map((col: any) => ({
      ...col,
      title: String(col.title || '').replace(/<[^>]*>/g, '').slice(0, 100),
      cards: Array.isArray(col.cards)
        ? col.cards.slice(0, 500).map((card: any) => ({
            ...card,
            title: String(card.title || '').replace(/<[^>]*>/g, '').slice(0, 200),
            description: String(card.description || '').replace(/<[^>]*>/g, '').slice(0, 2000),
          }))
        : [],
    }));

    await initDb();
    
    const db = getDb();
    await db.query(
      `INSERT INTO boards (id, user_id, data, updated_at) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = CURRENT_TIMESTAMP`,
      [boardId, userId, JSON.stringify(sanitizedData)]
    );

    // Update Cache
    const { redis, cacheEnabled } = getCache();
    if (cacheEnabled && redis) {
      redis.set(`board:${boardId}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to POST board', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
