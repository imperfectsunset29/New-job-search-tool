import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const RICH_TEXT_TYPES = ['paragraph', 'heading_1', 'heading_2', 'heading_3',
  'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout'];

export async function POST(req) {
  try {
    const { blocks, suggestions, accepted } = await req.json();
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    const acceptedSuggestions = suggestions.filter((_, i) => accepted[i]);
    let applied = 0;

    for (const s of acceptedSuggestions) {
      const block = typeof s.blockIndex === 'number'
        ? blocks[s.blockIndex]
        : blocks.find(b => b.text.includes(s.original));

      if (!block || !RICH_TEXT_TYPES.includes(block.type)) continue;

      await notion.blocks.update({
        block_id: block.id,
        [block.type]: {
          rich_text: [{ type: 'text', text: { content: s.suggested } }],
        },
      });
      applied++;
    }

    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
