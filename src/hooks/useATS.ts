import { useState, useCallback } from 'react';
import { CollectionStorage } from '../services/storage/asyncStorage.service';
import { STORAGE_KEYS } from '../config/constants';
import { ATSAnalyzerService } from '../services/ai/atsAnalyzer.ai';
import { settingsStorage } from '../services/storage/settings.storage';
import type { ATSAnalysis } from '../types/models';

const atsStorage = new CollectionStorage<ATSAnalysis>(STORAGE_KEYS.ATS_ANALYSES);

export function useATS() {
  const [analyses, setAnalyses] = useState<ATSAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ATSAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const all = await atsStorage.getAll();
    setAnalyses(all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, []);

  const analyze = useCallback(async (
    resumeText: string,
    jobDescription: string,
    jobTitle: string,
    resumeId: string,
    jobId: string | null
  ): Promise<ATSAnalysis | null> => {
    setLoading(true);
    setError(null);
    try {
      const settings = await settingsStorage.get();
      const analysis = await ATSAnalyzerService.analyze(
        resumeText,
        jobDescription,
        jobTitle,
        resumeId,
        jobId,
        settings.groq_api_key
      );
      await atsStorage.upsert(analysis);
      setCurrentAnalysis(analysis);
      setAnalyses((prev) => [analysis, ...prev]);
      return analysis;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAnalysis = useCallback(async (id: string): Promise<ATSAnalysis | null> => {
    const found = analyses.find((a) => a.id === id);
    if (found) {
      setCurrentAnalysis(found);
      return found;
    }
    const fromStorage = await atsStorage.getById(id);
    if (fromStorage) setCurrentAnalysis(fromStorage);
    return fromStorage;
  }, [analyses]);

  return { analyses, currentAnalysis, loading, error, analyze, loadHistory, getAnalysis };
}
