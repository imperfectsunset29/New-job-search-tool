import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function POST(req) {
  const { docUrl, jobDescription } = await req.json();

  const match = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid Google Doc URL' }, { status: 400 });
  }

  const exportUrl = `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
  const docRes = await fetch(exportUrl);
  if (!docRes.ok) {
    return NextResponse.json(
      { error: 'Could not read Google Doc. Set sharing to "Anyone with link can view".' },
      { status: 400 }
    );
  }
  const resumeText = await docRes.text();

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
    messages: [
      {
        role: 'user',
        content: `You are an expert resume coach. Propose up to 6 specific, high-impact edits to improve this resume's match for the job below. Prioritize incorporating missing keywords naturally.${fewShot}

Job Description:
${jobDescription}

Resume:
${resumeText}

Return only a valid JSON array, no markdown:
[{"section":"string","original":"exact text from resume to replace","suggested":"replacement text","reason":"one sentence why this helps"}]`,
      },
    ],
  });

  const raw = message.content[0].text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');

  let suggestions;
  try {
    suggestions = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ suggestions, resumeText });
}
