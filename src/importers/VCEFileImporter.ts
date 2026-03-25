import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ExamSet, Question, Option } from '../models';
import { ImporterAdapter } from './ImporterAdapter';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export class VCEFileImporter implements ImporterAdapter {
  canHandle(source: unknown): boolean {
    return source === 'vce-file';
  }

  async import(_source: unknown): Promise<ExamSet> {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('No file selected.');
    }

    const asset = result.assets[0];

    if (!asset.name.toLowerCase().endsWith('.vce')) {
      throw new Error('Please select a .vce file.');
    }

    // Read file as base64 and unzip
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Check magic bytes for Avanset proprietary format (not a standard ZIP)
    const headerBytes = base64.slice(0, 8);
    const decoded = atob(headerBytes.padEnd(8, '=').slice(0, 8));
    const isPK = decoded.charCodeAt(0) === 0x50 && decoded.charCodeAt(1) === 0x4b;

    let zip: JSZip;
    try {
      if (!isPK) {
        throw new Error('Not a ZIP-based VCE file.');
      }
      zip = await JSZip.loadAsync(base64, { base64: true });
    } catch {
      throw new Error(
        'This VCE file uses Avanset\'s encrypted format and cannot be parsed directly.\n\n' +
        'To use it in Learn.GG:\n' +
        '1. Visit examformatter.net\n' +
        '2. Upload your .vce file and convert to JSON\n' +
        '3. Use "Import JSON File" on this screen\n\n' +
        'Alternatively, try certblaster.com or vceplus.io for conversion.'
      );
    }

    // Find XML file inside zip
    const xmlFile = Object.keys(zip.files).find((name) =>
      name.toLowerCase().endsWith('.xml') && !zip.files[name].dir
    );

    if (!xmlFile) {
      throw new Error(
        'No question data found inside this VCE file.\n\n' +
        'This file may be encrypted. Try converting it to JSON using ExamFormatter (examformatter.net).'
      );
    }

    const xmlContent = await zip.files[xmlFile].async('string');
    return this._parseXML(xmlContent, asset.name.replace(/\.vce$/i, ''));
  }

  private _parseXML(xml: string, title: string): ExamSet {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => ['Question', 'Answer', 'Option', 'Choice'].includes(name),
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = parser.parse(xml) as Record<string, unknown>;
    } catch {
      throw new Error('Failed to parse VCE question data. The file format may not be supported.');
    }

    // Try common VCE XML structures
    const questions = this._extractQuestions(parsed);

    if (questions.length === 0) {
      throw new Error(
        'Could not extract questions from this VCE file.\n\n' +
        'The file format may differ from expected. Try converting to JSON using ExamFormatter (examformatter.net).'
      );
    }

    const examId = `vce-${Date.now()}`;
    return {
      id: examId,
      title: title || 'Imported VCE Exam',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      sections: [{ id: 'sec-1', title: 'Questions', questionIds: questions.map((q) => q.id) }],
      questions,
    };
  }

  private _extractQuestions(data: Record<string, unknown>): Question[] {
    // Walk the parsed object to find question arrays
    const candidates = this._findArrays(data);
    for (const arr of candidates) {
      const questions = this._tryMapQuestions(arr);
      if (questions.length > 0) return questions;
    }
    return [];
  }

  private _findArrays(obj: unknown, depth = 0): unknown[][] {
    if (depth > 6 || typeof obj !== 'object' || obj === null) return [];
    const results: unknown[][] = [];
    for (const val of Object.values(obj as Record<string, unknown>)) {
      if (Array.isArray(val) && val.length > 0) results.push(val);
      else results.push(...this._findArrays(val, depth + 1));
    }
    return results;
  }

  private _tryMapQuestions(arr: unknown[]): Question[] {
    const questions: Question[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item !== 'object' || item === null) continue;
      const q = item as Record<string, unknown>;

      // Look for text/question field
      const text = String(
        q.Text ?? q.text ?? q.Question ?? q.question ?? q.Body ?? q.body ?? ''
      ).trim();
      if (!text) continue;

      // Look for options/answers
      const rawOptions = (q.Answers ?? q.answers ?? q.Options ?? q.options ?? q.Choices ?? q.choices ?? []) as unknown[];
      if (!Array.isArray(rawOptions) || rawOptions.length < 2) continue;

      const options: Option[] = rawOptions.map((o, idx) => {
        const oObj = typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {};
        return {
          id: `q${i}-${idx}`,
          text: String(oObj.Text ?? oObj.text ?? oObj.Value ?? oObj.value ?? o ?? '').trim(),
        };
      });

      // Find correct answers
      const rawCorrect = q.CorrectAnswers ?? q.correctAnswers ?? q.Correct ?? q.correct ?? q.Answer ?? q.answer ?? [];
      const correctIndices: number[] = [];
      if (Array.isArray(rawCorrect)) {
        for (const c of rawCorrect) {
          const idx = typeof c === 'number' ? c : parseInt(String(c), 10);
          if (!isNaN(idx) && idx < options.length) correctIndices.push(idx);
        }
      } else if (typeof rawCorrect === 'number') {
        correctIndices.push(rawCorrect);
      }

      const correctAnswers = correctIndices.length > 0
        ? correctIndices.map((idx) => options[idx].id)
        : [options[0].id]; // fallback

      questions.push({
        id: `q${i}`,
        type: correctAnswers.length > 1 ? 'multiple_choice' : 'single_choice',
        text,
        options,
        correctAnswers,
        explanation: String(q.Explanation ?? q.explanation ?? q.Rationale ?? '').trim() || undefined,
      });
    }
    return questions;
  }
}
