import { writeFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { extractPageId, fetchNotionBlocks } from '../../lib/notion';

const SNAPSHOT_PATH = join(process.cwd(), '.neutral-snapshot.json');

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

    writeFileSync(SNAPSHOT_PATH, JSON.stringify(textBlocks, null, 2));
    return NextResponse.json({ saved: true, blockCount: textBlocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
