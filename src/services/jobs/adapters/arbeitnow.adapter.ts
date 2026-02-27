import type { IJobAdapter, NormalizedJob } from './types';

export class ArbeitnowAdapter implements IJobAdapter {
  platformName = 'arbeitnow';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Arbeitnow API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.data || [];

    return jobs.slice(0, 20).map((job: any): NormalizedJob => ({
      title: job.title || '',
      company_name: job.company_name || '',
      company_logo_url: null,
      description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      requirements: [],
      skills_required: job.tags || [],
      location: job.location || null,
      is_remote: job.remote === true,
      salary_min: null,
      salary_max: null,
      salary_currency: 'EUR',
      job_type: 'full_time',
      experience_level: this.guessExperienceLevel(job.title || ''),
      source_platform: 'arbeitnow',
      source_url: job.url || null,
      external_id: job.slug || String(Date.now()),
      posted_at: job.created_at || new Date().toISOString(),
      metadata: { tags: job.tags },
    }));
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr.')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head of')) return 'lead';
    return 'mid';
  }
}
