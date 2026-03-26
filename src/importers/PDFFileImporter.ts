import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ExamSet } from '../models';
import { ImporterAdapter } from './ImporterAdapter';
import { parseQuestionsFromText } from '../utils/pdfQuestionParser';

export class PDFFileImporter implements ImporterAdapter {
  canHandle(source: unknown): boolean {
    return source === 'pdf-file';
  }

  async import(_source: unknown): Promise<ExamSet> {
    // PDF parsing via pdfjs-dist works best in a web/browser environment.
    // On native, instruct the user to use the web version or JSON import.
    if (Platform.OS !== 'web') {
      throw new Error(
        'PDF import is only available on the web version of this app.\n\n' +
        'On mobile, please:\n' +
        '1. Open the app in a browser (Expo web)\n' +
        '2. Use "Import PDF File" from there\n\n' +
        'Alternatively, convert your PDF to JSON format and use "Import JSON File".'
      );
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('No file selected.');
    }

    const asset = result.assets[0];

    if (!asset.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Please select a .pdf file.');
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Dynamically import pdfjs-dist (web only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs = (await import('pdfjs-dist')) as any;
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const doc = await pdfjs.getDocument({ data: bytes }).promise;

    // Extract text from all pages
    const allLines: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();

      const items = (content.items as Array<{ str: string; transform: number[] }>)
        .filter((i) => i.str && i.str.trim());

      // Sort by Y descending then X ascending (top-to-bottom, left-to-right)
      items.sort((a, b) => {
        const dy = b.transform[5] - a.transform[5];
        if (Math.abs(dy) > 3) return dy;
        return a.transform[4] - b.transform[4];
      });

      // Group into lines by Y proximity
      const lines: Array<{ y: number; text: string }> = [];
      let currentLine: { y: number; text: string } | null = null;
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

    const questions = parseQuestionsFromText(allLines);

    if (questions.length === 0) {
      throw new Error(
        'No questions could be extracted from this PDF.\n\n' +
        'Make sure the PDF contains exam questions in the format:\n' +
        'QUESTION 1\n' +
        '<question text>\n' +
        'A. <option>\n' +
        'B. <option>\n' +
        'Correct Answer: A\n\n' +
        'Alternatively, convert your PDF to JSON format and use "Import JSON File".'
      );
    }

    const examId = `pdf-${Date.now()}`;
    return {
      id: examId,
      title: asset.name.replace(/\.pdf$/i, ''),
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      sections: [{ id: 'sec-1', title: 'Questions', questionIds: questions.map((q) => q.id) }],
      questions,
    };
  }
}
