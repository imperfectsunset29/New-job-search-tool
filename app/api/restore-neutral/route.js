import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { writeBlocks } from '../../lib/notion';

const SNAPSHOT_PATH = join(process.cwd(), '.neutral-snapshot.json');

export async function POST() {
  try {
    if (!existsSync(SNAPSHOT_PATH)) {
      return NextResponse.json({ error: 'No neutral snapshot saved yet.' }, { status: 404 });
    }

    const blocks = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    await writeBlocks(blocks);
    return NextResponse.json({ restored: true, blockCount: blocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
