import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getCache } from '@/lib/cache';

const BOARD_ID = 'main-board';

export async function GET() {
  try {
    await initDb();
    
    // Try Cache First
    const { redis, cacheEnabled } = getCache();
    if (cacheEnabled && redis) {
      try {
        const cachedData = await redis.get(`board:${BOARD_ID}`);
        if (cachedData) {
          return NextResponse.json(JSON.parse(cachedData));
        }
      } catch (e) {
        console.warn('Cache read failed, falling back to DB');
      }
    }

    // Fallback to DB
    const db = getDb();
    const result = await db.query('SELECT data FROM boards WHERE id = $1', [BOARD_ID]);
    
    if (result.rows.length > 0) {
      const data = result.rows[0].data;
      // Sync cache
      if (cacheEnabled && redis) {
        redis.set(`board:${BOARD_ID}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
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
    const data = await req.json();
    await initDb();
    
    const db = getDb();
    await db.query(
      `INSERT INTO boards (id, data, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
      [BOARD_ID, JSON.stringify(data)]
    );

    // Update Cache
    const { redis, cacheEnabled } = getCache();
    if (cacheEnabled && redis) {
      redis.set(`board:${BOARD_ID}`, JSON.stringify(data), 'EX', 3600).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to POST board', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
