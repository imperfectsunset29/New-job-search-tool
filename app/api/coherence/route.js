import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { extractPageId, fetchNotionBlocks } from '../../lib/notion';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { pageUrl } = await req.json();
    const pageId = extractPageId(pageUrl);
    if (!pageId) return NextResponse.json({ error: 'Invalid Notion page URL' }, { status: 400 });

    const blocks = await fetchNotionBlocks(pageId);
    const resumeText = blocks.map(b => b.text).filter(Boolean).join('\n');

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'Could not read Notion page.' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `This resume has been edited piecemeal across many job applications and may have tonal inconsistencies — different registers, rhythms, or phrasings sitting next to each other.

Rewrite it as a single unified voice. Preserve all facts, dates, titles, and metrics exactly. Do not add or remove content. Only reconcile tone and phrasing.

Return a JSON array of objects for every block that needs changing:
[{ "original": "<exact original text>", "suggested": "<rewritten text>", "section": "coherence", "type": "edit", "reason": "<one sentence why>" }]
Only include blocks that actually need changing. If a block is already consistent, omit it.
Return only the JSON array, no markdown.

Resume:
${resumeText}`,
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

    return NextResponse.json({ suggestions, blocks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
