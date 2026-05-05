import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function POST(req) {
  const { suggestions, accepted } = await req.json();

  try {
    const redis = getRedis();
    if (redis) {
      const existing = (await redis.get('examples')) || [];
      const newExamples = suggestions.map((s, i) => ({
        section: s.section,
        original: s.original,
        suggested: s.suggested,
        accepted: accepted[i] ?? true,
      }));
      const updated = [...existing, ...newExamples].slice(-50);
      await redis.set('examples', updated);
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
