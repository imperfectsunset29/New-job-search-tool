import { NextResponse } from 'next/server';
import { writeBlocks } from '../../lib/notion';

async function loadSnapshot() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    return await redis.get('neutral_snapshot');
  } else {
    const { existsSync, readFileSync } = await import('fs');
    const { join } = await import('path');
    const path = join(process.cwd(), '.neutral-snapshot.json');
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  }
}

export async function POST() {
  try {
    const blocks = await loadSnapshot();
    if (!blocks || !blocks.length) {
      return NextResponse.json({ error: 'No neutral snapshot saved yet.' }, { status: 404 });
    }

    await writeBlocks(blocks);
    return NextResponse.json({ restored: true, blockCount: blocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
