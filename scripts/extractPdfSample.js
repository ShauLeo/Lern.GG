/**
 * Extracts the first 10 questions from Test.pdf and writes them to
 * src/data/defaultExam.json using pdfjs-dist for proper font decoding.
 *
 * Run: node scripts/extractPdfSample.js
 */

const path = require('path');
const fs = require('fs');

async function main() {
  // Use the legacy build which supports Node.js without a DOM
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false; // disable worker in Node

  const pdfPath = path.resolve('C:/Users/Administrator/Downloads/Test.pdf');
  const outPath = path.resolve(__dirname, '../src/data/defaultExam.json');

  console.log('Loading PDF:', pdfPath);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  console.log(`PDF loaded — ${doc.numPages} pages`);

  // Extract text from pages 1–60 (more than enough for 10 questions)
  const allLines = [];
  const maxPage = Math.min(doc.numPages, 60);
  for (let pageNum = 1; pageNum <= maxPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    // Merge items into lines by grouping items with similar Y position
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

  // Parse questions from lines
  const questions = parseQuestions(allLines);
  console.log(`Parsed ${questions.length} questions`);

  const first10 = questions.slice(0, 10);
  if (first10.length < 10) {
    console.warn(`Warning: only found ${first10.length} questions (wanted 10)`);
  }

  first10.forEach((q, i) => {
    console.log(`Q${i + 1}: ${q.text.slice(0, 80)}...`);
    console.log(`   Options: ${q.options.map((o) => o.text.slice(0, 30)).join(' | ')}`);
    console.log(`   Correct: ${q.correctAnswers.join(', ')}`);
  });

  const examSet = {
    id: 'default-exam',
    title: 'CompTIA A+ Practice Exam',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    sections: [{ id: 'sec-1', title: 'Questions', questionIds: first10.map((q) => q.id) }],
    questions: first10,
  };

  fs.writeFileSync(outPath, JSON.stringify(examSet, null, 2), 'utf8');
  console.log(`\nWrote ${first10.length} questions to ${outPath}`);
}

function parseQuestions(lines) {
  // Regex patterns
  const questionRe = /^\s*(\d+)[.)]\s+(.+)/;
  const optionRe = /^\s*([A-E])[.)]\s+(.+)/i;
  const answerRe = /(?:^|\s)(?:answer|correct\s+answer)[s]?\s*[:\-]?\s*([A-E](?:[,\s]+[A-E])*)/i;
  const multiAnswerRe = /^([A-E])(?:[,\s]+([A-E]))+/i;

  const questions = [];
  let current = null;
  let state = 'IDLE'; // IDLE | IN_QUESTION | IN_OPTIONS

  const finalizeCurrent = () => {
    if (!current) return;
    if (current.options.length >= 2) {
      questions.push(current);
    }
    current = null;
    state = 'IDLE';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for answer line
    const answerMatch = trimmed.match(answerRe);
    if (answerMatch && current) {
      const rawAnswers = answerMatch[1];
      const letters = rawAnswers.match(/[A-E]/gi) || [];
      current.pendingCorrectLetters = letters.map((l) => l.toUpperCase());
      continue;
    }

    // Check for new question
    const qMatch = trimmed.match(questionRe);
    if (qMatch) {
      finalizeCurrent();
      const qNum = parseInt(qMatch[1], 10);
      current = {
        _num: qNum,
        _optionLetters: [],
        pendingCorrectLetters: [],
        id: `q${qNum}`,
        type: 'single_choice',
        text: qMatch[2].trim(),
        options: [],
        correctAnswers: [],
        explanation: undefined,
      };
      state = 'IN_QUESTION';
      continue;
    }

    // Check for option
    const optMatch = trimmed.match(optionRe);
    if (optMatch && current) {
      const letter = optMatch[1].toUpperCase();
      const text = optMatch[2].trim();
      const id = `q${current._num}-${letter.toLowerCase()}`;
      current.options.push({ id, text });
      current._optionLetters.push(letter);
      state = 'IN_OPTIONS';
      continue;
    }

    // Multi-line continuation
    if (current && state === 'IN_QUESTION') {
      // Append to question text if not an option-looking line
      current.text += ' ' + trimmed;
    } else if (current && state === 'IN_OPTIONS' && current.options.length > 0) {
      // Append to last option
      const last = current.options[current.options.length - 1];
      last.text += ' ' + trimmed;
    }
  }
  finalizeCurrent();

  // Resolve correct answers
  for (const q of questions) {
    if (q.pendingCorrectLetters.length > 0) {
      q.correctAnswers = q.pendingCorrectLetters
        .map((l) => {
          const idx = q._optionLetters.indexOf(l);
          return idx >= 0 ? q.options[idx].id : null;
        })
        .filter(Boolean);
    }
    if (q.correctAnswers.length === 0 && q.options.length > 0) {
      q.correctAnswers = [q.options[0].id]; // fallback
    }
    q.type = q.correctAnswers.length > 1 ? 'multiple_choice' : 'single_choice';
    // Clean internal tracking fields
    delete q._num;
    delete q._optionLetters;
    delete q.pendingCorrectLetters;
  }

  return questions;
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
