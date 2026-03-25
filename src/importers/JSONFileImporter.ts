import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ExamSet } from '../models';
import { ImporterAdapter } from './ImporterAdapter';

export class JSONFileImporter implements ImporterAdapter {
  canHandle(source: unknown): boolean {
    return source === 'json-file';
  }

  async import(_source: unknown): Promise<ExamSet> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      throw new Error('No file selected.');
    }

    const asset = result.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Invalid JSON file. Please check the file format.');
    }

    return this._validate(parsed);
  }

  private _validate(data: unknown): ExamSet {
    if (typeof data !== 'object' || data === null) throw new Error('Invalid exam file: expected a JSON object.');
    const obj = data as Record<string, unknown>;
    if (!obj.id || !obj.title || !Array.isArray(obj.questions)) {
      throw new Error('Invalid exam format: missing required fields (id, title, questions).');
    }
    if ((obj.questions as unknown[]).length === 0) {
      throw new Error('Exam file contains no questions.');
    }
    return {
      id: String(obj.id),
      title: String(obj.title),
      version: String(obj.version ?? '1.0.0'),
      createdAt: String(obj.createdAt ?? new Date().toISOString()),
      sections: Array.isArray(obj.sections) ? (obj.sections as ExamSet['sections']) : [],
      questions: obj.questions as ExamSet['questions'],
    };
  }
}
