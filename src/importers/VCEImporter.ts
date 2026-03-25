import { ExamSet } from '../models';
import { ImporterAdapter } from './ImporterAdapter';
export class VCEImporter implements ImporterAdapter {
  canHandle(source: unknown): boolean {
    return typeof source === 'object' && source !== null && (source as Record<string, unknown>).type === 'vce';
  }
  async import(_source: unknown): Promise<ExamSet> {
    throw new Error('VCEImporter not yet implemented. Convert .vce to JSON first.');
  }
}
