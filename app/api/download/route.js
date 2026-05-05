import { Document, Packer, Paragraph, TextRun } from 'docx';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { resumeText, suggestions, accepted } = await req.json();

  let text = resumeText;
  suggestions.forEach((s, i) => {
    if (accepted[i] && s.original) text = text.split(s.original).join(s.suggested);
  });

  const paragraphs = text.split('\n').map(line =>
    new Paragraph({ children: [new TextRun(line)] })
  );

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="resume_optimized.docx"',
    },
  });
}
