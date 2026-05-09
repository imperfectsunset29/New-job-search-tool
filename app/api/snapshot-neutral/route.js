import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { extractPageId, fetchNotionBlocks } from '../../lib/notion';

export async function POST(req) {
  try {
    const { pageUrl } = await req.json();
    const pageId = extractPageId(pageUrl);
    if (!pageId) return NextResponse.json({ error: 'Invalid Notion page URL' }, { status: 400 });

    const blocks = await fetchNotionBlocks(pageId);
    const textBlocks = blocks.filter(b => b.text);

    if (!textBlocks.length) {
      return NextResponse.json({ error: 'Could not read Notion page.' }, { status: 400 });
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({ error: 'Redis is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment.' }, { status: 503 });
    }
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    await redis.set('neutral_snapshot', textBlocks);

    return NextResponse.json({ saved: true, blockCount: textBlocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
