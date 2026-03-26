import { useState, useEffect, useCallback } from 'react';
import { ExamSet } from '../models';
import {
  loadActiveExamSet, saveExamSet, loadAllExamSets,
  setActiveExamSetId, removeExamSet as removeExamSetFromStore,
} from '../storage/store';
import { MockImporter } from '../importers/MockImporter';
import { JSONFileImporter } from '../importers/JSONFileImporter';
import { VCEFileImporter } from '../importers/VCEFileImporter';
import { PDFFileImporter } from '../importers/PDFFileImporter';
import { getImporter } from '../importers/ImporterAdapter';

const adapters = [new MockImporter(), new JSONFileImporter(), new VCEFileImporter(), new PDFFileImporter()];

export function useExamSet() {
  const [examSet, setExamSet] = useState<ExamSet | null>(null);
  const [examLibrary, setExamLibrary] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLibrary = useCallback(async () => {
    const all = await loadAllExamSets();
    setExamLibrary(all);
  }, []);

  useEffect(() => {
    async function init() {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const defaultExam = require('../data/defaultExam.json') as ExamSet;
      const [active, all] = await Promise.all([loadActiveExamSet(), loadAllExamSets()]);

      if (active === null && all.length === 0) {
        // First launch — seed the default exam
        await saveExamSet(defaultExam);
        setExamSet(defaultExam);
        setExamLibrary([defaultExam]);
      } else {
        // Check if the stored default exam is outdated (fewer questions than bundled JSON)
        const storedDefault = all.find((e) => e.id === defaultExam.id);
        if (storedDefault && storedDefault.questions.length < defaultExam.questions.length) {
          await saveExamSet(defaultExam);
          const newActive = active?.id === defaultExam.id ? defaultExam : active;
          const newAll = all.map((e) => e.id === defaultExam.id ? defaultExam : e);
          setExamSet(newActive);
          setExamLibrary(newAll);
        } else {
          setExamSet(active);
          setExamLibrary(all);
        }
      }
    }
    init().catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  /** Parse a file and return the ExamSet WITHOUT saving — for confirm dialog. */
  const previewImport = useCallback(async (source: unknown): Promise<ExamSet> => {
    setLoading(true);
    setError(null);
    try {
      const importer = getImporter(adapters, source);
      return await importer.import(source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Save a previewed ExamSet and set it as active. */
  const finalizeImport = useCallback(async (result: ExamSet) => {
    await saveExamSet(result);
    setExamSet(result);
    await refreshLibrary();
  }, [refreshLibrary]);

  const switchExam = useCallback(async (id: string) => {
    await setActiveExamSetId(id);
    const all = await loadAllExamSets();
    const target = all.find((e) => e.id === id) ?? null;
    setExamSet(target);
    setExamLibrary(all);
  }, []);

  const removeExam = useCallback(async (id: string) => {
    await removeExamSetFromStore(id);
    const [active, all] = await Promise.all([loadActiveExamSet(), loadAllExamSets()]);
    setExamSet(active);
    setExamLibrary(all);
  }, []);

  const importMock = useCallback(() => previewImport('mock'), [previewImport]);
  const importFromJSON = useCallback(() => previewImport('json-file'), [previewImport]);
  const importFromVCE = useCallback(() => previewImport('vce-file'), [previewImport]);
  const importFromPDF = useCallback(() => previewImport('pdf-file'), [previewImport]);

  return {
    examSet, examLibrary, loading, error,
    importMock, importFromJSON, importFromVCE, importFromPDF,
    finalizeImport, switchExam, removeExam,
  };
}
