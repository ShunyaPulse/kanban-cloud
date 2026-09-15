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

    const userId = (session.user as any).id;
    const boardId = `user-board-${userId}`;

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

    const userId = (session.user as any).id;
    const boardId = `user-board-${userId}`;

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
    await initDb();
    
    const db = getDb();
    await db.query(
      `INSERT INTO boards (id, user_id, data, updated_at) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = CURRENT_TIMESTAMP`,
      [boardId, userId, JSON.stringify(data)]
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
