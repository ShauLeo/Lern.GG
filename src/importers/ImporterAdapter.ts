import { ExamSet } from '../models';
export interface ImporterAdapter {
  canHandle(source: unknown): boolean;
  import(source: unknown): Promise<ExamSet>;
}
export function getImporter(adapters: ImporterAdapter[], source: unknown): ImporterAdapter {
  const adapter = adapters.find((a) => a.canHandle(source));
  if (!adapter) throw new Error('No importer found for this source format.');
  return adapter;
}
