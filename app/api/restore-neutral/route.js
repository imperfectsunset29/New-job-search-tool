import { NextResponse } from 'next/server';
import { writeBlocks } from '../../lib/notion';

export async function POST(req) {
  try {
    const { blocks } = await req.json();
    if (!blocks || !blocks.length) {
      return NextResponse.json({ error: 'No blocks provided.' }, { status: 400 });
    }

    await writeBlocks(blocks);
    return NextResponse.json({ restored: true, blockCount: blocks.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
