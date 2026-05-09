import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { writeBlocks } from '../../lib/notion';

export async function POST() {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const blocks = await redis.get('neutral_snapshot');
    if (!blocks || !blocks.length) {
      return NextResponse.json({ error: 'No neutral snapshot saved yet.' }, { status: 404 });
    }

    await writeBlocks(blocks);
    return NextResponse.json({ restored: true, blockCount: blocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
