/**
 * Extracts the first 10 questions from Test.pdf and writes them to
 * src/data/defaultExam.json using pdfjs-dist for proper font decoding.
 *
 * Run: node scripts/extractPdfSample.mjs
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Point to the worker file so pdfjs-dist can spawn it
const workerPath = new URL(
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const pdfPath = path.resolve('C:/Users/Administrator/Downloads/Test.pdf');
  const outPath = path.resolve(__dirname, '../src/data/defaultExam.json');

  console.log('Loading PDF:', pdfPath);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const cMapUrl = new URL('../node_modules/pdfjs-dist/cmaps/', import.meta.url).href + '/';
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true, cMapUrl, cMapPacked: true }).promise;
  console.log(`PDF loaded — ${doc.numPages} pages`);

  // Extract text from all pages
  const allLines = [];
  const maxPage = doc.numPages;
  for (let pageNum = 1; pageNum <= maxPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items.filter((i) => i.str && i.str.trim());

    // Sort by Y descending (PDF coords are bottom-up), then X ascending
    items.sort((a, b) => {
      const dy = b.transform[5] - a.transform[5];
      if (Math.abs(dy) > 2) return dy;
      return a.transform[4] - b.transform[4];
    });

    // Group items into lines by Y proximity
    const lines = [];
    let currentLine = null;
    for (const item of items) {
      const y = item.transform[5];
      if (!currentLine || Math.abs(currentLine.y - y) > 3) {
        currentLine = { y, text: item.str };
        lines.push(currentLine);
      } else {
        currentLine.text += ' ' + item.str;
      }
    }
    for (const line of lines) {
      const t = line.text.trim();
      if (t) allLines.push(t);
    }
  }

  console.log(`Extracted ${allLines.length} text lines`);
  // Print first 50 lines to understand the format
  console.log('\n--- First 50 lines ---');
  allLines.slice(0, 50).forEach((l, i) => console.log(`${i + 1}: ${l}`));
  console.log('---\n');

  // Parse questions from lines
  const questions = parseQuestions(allLines);
  console.log(`Parsed ${questions.length} questions`);

  // Print first 5 for inspection
  questions.slice(0, 5).forEach((q, i) => {
    console.log(`\nQ${i + 1}: ${q.text.slice(0, 100)}`);
    console.log(`   Options (${q.options.length}): ${q.options.map((o) => o.text.slice(0, 40)).join(' | ')}`);
    console.log(`   Correct IDs: ${q.correctAnswers.join(', ')}`);
  });

  const examSet = {
    id: 'default-exam',
    title: 'CCNA 200-301 Practice Exam',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    sections: [{ id: 'sec-1', title: 'Questions', questionIds: questions.map((q) => q.id) }],
    questions,
  };

  fs.writeFileSync(outPath, JSON.stringify(examSet, null, 2), 'utf8');
  console.log(`\nWrote ${questions.length} questions to ${outPath}`);
}

function parseQuestions(lines) {
  // Join all lines into one big blob then split on QUESTION N pattern
  const blob = lines.join(' ');

  // Split on "QUESTION <number>" — each chunk is one question block
  const chunks = blob.split(/QUESTION\s+(\d+)/i);
  // chunks = [preamble, num1, block1, num2, block2, ...]

  const questions = [];

  for (let i = 1; i < chunks.length - 1; i += 2) {
    const qNum = parseInt(chunks[i], 10);
    const block = chunks[i + 1].trim();

    // Extract correct answer(s): "Correct Answer: A" or "Correct Answer: AB"
    const correctMatch = block.match(/Correct\s+Answer\s*[:\-]\s*([A-E]+(?:[,\s]+[A-E]+)*)/i);
    const correctLetters = correctMatch
      ? correctMatch[1].match(/[A-E]/gi).map((l) => l.toUpperCase())
      : [];

    // Remove "Correct Answer..." and everything after "Section:" from block
    const cleanBlock = block.replace(/Correct\s+Answer.*$/i, '').replace(/Section\s*:.*$/i, '').trim();

    // Split options by "A. " "B. " etc.
    // Prepend a space so first option (e.g. "A. text") is always preceded by whitespace
    const optionSplitRe = /\s([A-E])\.\s/;
    const parts = (' ' + cleanBlock).split(optionSplitRe);
    // parts = [questionText, "A", optA, "B", optB, ...]

    if (parts.length < 3) continue; // need at least question + 1 option pair

    const questionText = parts[0].trim();
    if (!questionText) continue;

    const options = [];
    const optionLetters = [];
    for (let j = 1; j < parts.length - 1; j += 2) {
      const letter = parts[j].trim().toUpperCase();
      const text = parts[j + 1].trim();
      const id = `q${qNum}-${letter.toLowerCase()}`;
      options.push({ id, text });
      optionLetters.push(letter);
    }

    if (options.length < 2) continue;

    const correctAnswers = correctLetters
      .map((l) => {
        const idx = optionLetters.indexOf(l);
        return idx >= 0 ? options[idx].id : null;
      })
      .filter(Boolean);

    if (correctAnswers.length === 0 && options.length > 0) {
      correctAnswers.push(options[0].id);
    }

    questions.push({
      id: `q${qNum}`,
      type: correctAnswers.length > 1 ? 'multiple_choice' : 'single_choice',
      text: questionText,
      options,
      correctAnswers,
      explanation: undefined,
    });
  }

  return questions;
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
