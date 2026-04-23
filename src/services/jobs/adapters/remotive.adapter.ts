import type { IJobAdapter, NormalizedJob } from './types';

export class RemotiveAdapter implements IJobAdapter {
  platformName = 'remotive';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Remotive API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.jobs || [];

    return jobs.map((job: any): NormalizedJob => ({
      title: job.title || '',
      company_name: job.company_name || '',
      company_logo_url: job.company_logo || null,
      description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      requirements: [],
      skills_required: this.extractSkills(job.tags || []),
      location: job.candidate_required_location || null,
      is_remote: true,
      salary_min: null,
      salary_max: null,
      salary_currency: 'USD',
      job_type: this.mapJobType(job.job_type),
      experience_level: this.guessExperienceLevel(job.title || ''),
      source_platform: 'remotive',
      source_url: job.url || null,
      external_id: String(job.id),
      posted_at: job.publication_date || new Date().toISOString(),
      metadata: { category: job.category, tags: job.tags },
    }));
  }

  private extractSkills(tags: string[]): string[] {
    return tags.filter((t) => t.length > 1 && t.length < 30);
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr.')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head of')) return 'lead';
    return 'mid';
  }

  private mapJobType(type: string): string {
    const map: Record<string, string> = {
      full_time: 'full_time',
      contract: 'contract',
      part_time: 'part_time',
      freelance: 'freelance',
      internship: 'internship',
    };
    return map[type?.toLowerCase()] || 'full_time';
  }
}
