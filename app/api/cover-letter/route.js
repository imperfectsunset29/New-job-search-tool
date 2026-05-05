import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TONE_DESCRIPTIONS = {
  professional: 'Formal, measured, and concise. No exclamation marks. Authoritative but not stiff.',
  conversational: 'Warm and direct. First-person voice that reads like a human wrote it, not a template. Natural sentence flow.',
  enthusiastic: 'Energetic and forward-leaning. Shows genuine excitement for the role without being over the top.',
};

export async function POST(req) {
  try {
    const { resumeText, jobDescription, tone = 'professional', notes = '' } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Missing resumeText or jobDescription' }, { status: 400 });
    }

    const toneDescription = TONE_DESCRIPTIONS[tone] ?? TONE_DESCRIPTIONS.professional;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an expert cover letter writer. Write a ${tone} cover letter tailored to this job description using the candidate's resume.

Tone guidance: ${toneDescription}

Structure:
- First paragraph: why this role and company excite them (infer from the job description)
- Middle paragraph(s): 2-3 strongest matching experiences from the resume
- Closing: confident call to action
${notes.trim() ? `\nGuidelines from the candidate — follow these closely:\n${notes.trim()}` : ''}

Job Description:
${jobDescription}

Resume:
${resumeText}

Return only the cover letter text. No subject line, no JSON, no markdown.`,
      }],
    });

    const coverLetter = message.content[0].text.trim();
    return NextResponse.json({ coverLetter });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
