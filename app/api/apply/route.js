import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { blocks, suggestions, accepted } = await req.json();
    const notion = new Client({ auth: process.env.NOTION_API_KEY });

    const acceptedSuggestions = suggestions.filter((_, i) => accepted[i]);

    for (const s of acceptedSuggestions) {
      const block = blocks.find(b => b.text.includes(s.original));
      if (!block) continue;

      const newText = block.text.split(s.original).join(s.suggested);

      const richTextTypes = ['paragraph', 'heading_1', 'heading_2', 'heading_3',
        'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout'];

      if (!richTextTypes.includes(block.type)) continue;

      await notion.blocks.update({
        block_id: block.id,
        [block.type]: {
          rich_text: [{ type: 'text', text: { content: newText } }],
        },
      });
    }

    return NextResponse.json({ ok: true, applied: acceptedSuggestions.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
