import { Document, Packer, Paragraph, TextRun } from 'docx';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { coverLetter } = await req.json();

  const paragraphs = coverLetter.split('\n\n').flatMap(block => [
    new Paragraph({ children: [new TextRun(block.replace(/\n/g, ' '))] }),
    new Paragraph({ children: [new TextRun('')] }),
  ]);

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="cover_letter.docx"',
    },
  });
}
