import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function extractPageId(pageUrl) {
  // Handles: notion.so/Title-{id}, notion.so/{id}, app.notions.so/.../{id}
  const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i) ||
                pageUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  return match ? match[1] : null;
}

function blockToText(block) {
  const type = block.type;
  const richTextTypes = ['paragraph', 'heading_1', 'heading_2', 'heading_3',
    'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout'];

  if (!richTextTypes.includes(type)) return null;

  const richText = block[type]?.rich_text ?? [];
  return richText.map(t => t.plain_text).join('');
}

async function fetchNotionBlocks(pageId) {
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

export async function POST(req) {
  try {
    const { pageUrl, jobDescription } = await req.json();

    const pageId = extractPageId(pageUrl);
    if (!pageId) {
      return NextResponse.json({ error: 'Invalid Notion page URL' }, { status: 400 });
    }

    const blocks = await fetchNotionBlocks(pageId);
    const resumeText = blocks.map(b => b.text).filter(Boolean).join('\n');

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'Could not read Notion page. Make sure you shared it with the integration.' }, { status: 400 });
    }

    let examples = [];
    try {
      const redis = getRedis();
      if (redis) examples = (await redis.get('examples')) || [];
    } catch {}

    const approved = examples.filter(e => e.accepted).slice(-5);
    const rejected = examples.filter(e => !e.accepted).slice(-3);

    let fewShot = '';
    if (approved.length) {
      fewShot += '\nEdits this user approved — match this tone and style:\n';
      approved.forEach((e, i) => {
        fewShot += `${i + 1}. Before: "${e.original}"\n   After: "${e.suggested}"\n`;
      });
    }
    if (rejected.length) {
      fewShot += '\nEdits this user rejected — avoid this style:\n';
      rejected.forEach((e, i) => {
        fewShot += `${i + 1}. Before: "${e.original}"\n   After: "${e.suggested}"\n`;
      });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are an expert resume coach. Analyze this resume against the job description and return two types of suggestions:

1. EDITS (type "edit"): up to 4 targeted rewrites that incorporate missing keywords or strengthen weak descriptions
2. CUTS (type "cut"): up to 3 specific passages that are too long, redundant, or irrelevant to this role — with a tighter version
${fewShot}
Job Description:
${jobDescription}

Resume:
${resumeText}

Return only a valid JSON array, no markdown:
[{"type":"edit"|"cut","section":"string","original":"exact text from resume","suggested":"replacement (shorter for cuts)","reason":"one sentence why"}]`,
      }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

    let suggestions;
    try {
      suggestions = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ suggestions, resumeText, blocks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
