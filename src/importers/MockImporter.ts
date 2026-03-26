import { ExamSet } from '../models';
import { ImporterAdapter } from './ImporterAdapter';
import mockExam from '../data/defaultExam.json';
export class MockImporter implements ImporterAdapter {
  canHandle(source: unknown): boolean { return source === 'mock'; }
  async import(_source: unknown): Promise<ExamSet> {
    return new Promise((resolve) => setTimeout(() => resolve(mockExam as ExamSet), 300));
  }
}
