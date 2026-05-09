import { NextResponse } from 'next/server';
import { extractPageId, fetchNotionBlocks } from '../../lib/notion';

async function saveSnapshot(blocks) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    await redis.set('neutral_snapshot', blocks);
  } else {
    const { writeFileSync } = await import('fs');
    const { join } = await import('path');
    writeFileSync(join(process.cwd(), '.neutral-snapshot.json'), JSON.stringify(blocks, null, 2));
  }
}

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

    await saveSnapshot(textBlocks);
    return NextResponse.json({ saved: true, blockCount: textBlocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
