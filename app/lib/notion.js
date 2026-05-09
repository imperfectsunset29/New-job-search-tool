import { Client } from '@notionhq/client';

const RICH_TEXT_TYPES = ['paragraph', 'heading_1', 'heading_2', 'heading_3',
  'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout'];

export function extractPageId(pageUrl) {
  const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i) ||
                pageUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  return match ? match[1] : null;
}

function blockToText(block) {
  if (!RICH_TEXT_TYPES.includes(block.type)) return null;
  const richText = block[block.type]?.rich_text ?? [];
  return richText.map(t => t.plain_text).join('');
}

export async function fetchNotionBlocks(pageId) {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const blocks = [];
  let cursor;

  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return blocks.map(b => ({ id: b.id, type: b.type, text: blockToText(b) ?? '' }));
}

export async function writeBlocks(blocks) {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  for (const block of blocks) {
    if (!RICH_TEXT_TYPES.includes(block.type) || !block.text) continue;
    await notion.blocks.update({
      block_id: block.id,
      [block.type]: {
        rich_text: [{ type: 'text', text: { content: block.text } }],
      },
    });
  }
}
