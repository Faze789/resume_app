import { useState, useEffect, useCallback } from 'react';
import { resumeStorage } from '../services/storage/resume.storage';
import { generateId } from '../utils/id';
import { nowISO } from '../utils/date';
import { DEFAULT_STYLE_CONFIG, DEFAULT_SECTION_ORDER } from '../types/models';
import type { Resume, ResumeContent } from '../types/models';

export function useResume(userId: string | undefined) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResumes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const all = await resumeStorage.getAll();
      setResumes(all.filter((r) => r.user_id === userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const createResume = useCallback(async (title: string): Promise<Resume> => {
    const now = nowISO();
    const resume: Resume = {
      id: generateId(),
      user_id: userId!,
      title,
      version: 1,
      is_primary: resumes.length === 0,
      content: {
        personal_info: { full_name: '', email: '' },
        summary: '',
        sections: [
          { type: 'experience', title: 'Work Experience', items: [] },
          { type: 'education', title: 'Education', items: [] },
          { type: 'skills', title: 'Skills', items: [] },
          { type: 'projects', title: 'Projects', items: [] },
        ],
      },
      section_order: DEFAULT_SECTION_ORDER,
      template_id: 'professional',
      style_config: DEFAULT_STYLE_CONFIG,
      last_ats_score: null,
      raw_text: null,
      created_at: now,
      updated_at: now,
    };
    await resumeStorage.upsert(resume);
    setResumes((prev) => [...prev, resume]);
    return resume;
  }, [userId, resumes.length]);

  const updateResume = useCallback(async (id: string, updates: Partial<Resume>) => {
    const existing = await resumeStorage.getById(id);
    if (!existing) return;
    const updated = { ...existing, ...updates, updated_at: nowISO() };
    await resumeStorage.upsert(updated);
    setResumes((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const updateResumeContent = useCallback(async (id: string, content: ResumeContent) => {
    await updateResume(id, { content });
  }, [updateResume]);

  const deleteResume = useCallback(async (id: string) => {
    await resumeStorage.remove(id);
    setResumes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { resumes, loading, createResume, updateResume, updateResumeContent, deleteResume, refresh: loadResumes };
}
