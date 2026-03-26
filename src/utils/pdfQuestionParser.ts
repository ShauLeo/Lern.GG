import { Question, Option } from '../models';

/**
 * Parses questions from raw text lines extracted from a PDF.
 *
 * Supports the common exam PDF format where questions appear as:
 *   QUESTION 1
 *   <question text>
 *   A. <option>
 *   B. <option>
 *   C. <option>
 *   D. <option>
 *   Correct Answer: A
 *
 * Also handles the single-blob format where all content for multiple
 * questions is joined on one line, by splitting on "QUESTION <N>" first.
 */
export function parseQuestionsFromText(lines: string[]): Question[] {
  // Join all lines into one blob then split by QUESTION N
  const blob = lines.join(' ');
  const chunks = blob.split(/QUESTION\s+(\d+)/i);
  // chunks = [preamble, num1, block1, num2, block2, ...]

  const questions: Question[] = [];

  for (let i = 1; i < chunks.length - 1; i += 2) {
    const qNum = parseInt(chunks[i], 10);
    const block = chunks[i + 1].trim();

    // Extract correct answer(s): "Correct Answer: A" or "Correct Answer: AB" or "Correct Answer: A, B"
    const correctMatch = block.match(/Correct\s+Answer\s*[:\-]\s*([A-E]+(?:[,\s]+[A-E]+)*)/i);
    const correctLetters: string[] = correctMatch
      ? (correctMatch[1].match(/[A-E]/gi) ?? []).map((l) => l.toUpperCase())
      : [];

    // Remove everything from "Correct Answer" onwards, and "Section: ..." markers
    const cleanBlock = block
      .replace(/Correct\s+Answer.*$/i, '')
      .replace(/Section\s*:.*$/i, '')
      .trim();

    // Split on option delimiters " A. " " B. " etc.
    const parts = cleanBlock.split(/\s([A-E])\.\s/);
    // parts = [questionText, "A", optTextA, "B", optTextB, ...]

    if (parts.length < 3) continue;

    const questionText = parts[0].trim();
    if (!questionText) continue;

    const options: Option[] = [];
    const optionLetters: string[] = [];

    for (let j = 1; j < parts.length - 1; j += 2) {
      const letter = parts[j].trim().toUpperCase();
      const text = parts[j + 1].trim();
      if (!text || text === letter + '.') continue; // skip empty options
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
      .filter((id): id is string => id !== null);

    if (correctAnswers.length === 0 && options.length > 0) {
      correctAnswers.push(options[0].id); // fallback to first option
    }

    questions.push({
      id: `q${qNum}`,
      type: correctAnswers.length > 1 ? 'multiple_choice' : 'single_choice',
      text: questionText,
      options,
      correctAnswers,
    });
  }

  return questions;
}
