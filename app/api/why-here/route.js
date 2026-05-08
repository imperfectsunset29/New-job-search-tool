import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TONE_VOICES = {
  professional: `Voice: first-person, measured, and precise. No superlatives — no "thrilled", "passionate", "excited to join". Confident without being effusive. The speaker knows their value and states it clearly.`,
  conversational: `Voice: first-person, warm, direct. No superlatives — no "thrilled", "passionate", "excited to join". Short sentences are fine. The speaker has a wabi-sabi sensibility: she's drawn to the imperfect, the still-becoming, the specific texture of a thing rather than its polished category. She values what's hidden or underrated about a company more than its headline pitch.`,
  enthusiastic: `Voice: first-person, energetic, forward-leaning. No superlatives — no "thrilled", "passionate", "excited to join". The speaker conveys real momentum and appetite for the work — through specifics, not adjectives. Short punchy sentences land harder than long ones.`,
  edgy: `Voice: first-person, sharp, unconventional. No superlatives — no "thrilled", "passionate", "excited to join". The speaker thinks in systems and contradictions. She's not here to impress — she's here because she sees something others miss. She might name a tension at the company, question a prevailing assumption in the industry, or connect the role to something unexpected. Sentences are short and deliberate. No hedging. No flattery. This answer would make a conventional interviewer slightly uncomfortable and a visionary interviewer lean forward.`,
};

export async function POST(req) {
  try {
    const { resumeText, jobDescription, question = 'Why do you want to work here?', tone = 'conversational', maxChars = null } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Missing resumeText or jobDescription' }, { status: 400 });
    }

    const voiceGuidance = TONE_VOICES[tone] ?? TONE_VOICES.conversational;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `You are helping someone prepare a spoken answer to "${question}"

First, identify the company from the job description. Then draw on what you know about that company — their products, culture, how they publicly describe themselves, recent pivots or signals. Use that knowledge to write the answer.

${voiceGuidance}

${maxChars ? `Length: aim for approximately ${maxChars} characters. Stay within 10% of that target.` : 'Write 1–2 paragraphs (60–90 seconds spoken).'}  Lead with something specific about the company that most candidates wouldn't name — a product detail, a cultural signal, the way they approach a problem. Then connect it to 1–2 concrete things from the candidate's background. No filler. No summary sentence at the end.

Job Description:
${jobDescription}

Candidate's Resume:
${resumeText}

Return only the answer text. No labels, no markdown.`,
      }],
    });

    return NextResponse.json({ answer: message.content[0].text.trim() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
