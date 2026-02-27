import type { IJobAdapter, NormalizedJob } from './types';

export class AdzunaAdapter implements IJobAdapter {
  platformName = 'adzuna';
  requiresApiKey = true;

  constructor(private appId: string, private appKey: string) {}

  // Adzuna-supported country codes
  private static COUNTRY_MAP: Record<string, string> = {
    australia: 'au', austria: 'at', brazil: 'br', canada: 'ca', germany: 'de',
    france: 'fr', uk: 'gb', 'united kingdom': 'gb', britain: 'gb', india: 'in',
    italy: 'it', netherlands: 'nl', 'new zealand': 'nz', poland: 'pl',
    russia: 'ru', singapore: 'sg', 'united states': 'us', usa: 'us', us: 'us',
    'south africa': 'za', pakistan: 'gb', // fallback: no PK endpoint, use GB as closest intl
  };

  private deriveCountryCode(location: string): string {
    const lower = location.toLowerCase();
    for (const [name, code] of Object.entries(AdzunaAdapter.COUNTRY_MAP)) {
      if (lower.includes(name)) return code;
    }
    return 'us'; // default
  }

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const country = location ? this.deriveCountryCode(location) : 'us';
    const loc = location ? `&where=${encodeURIComponent(location)}` : '';
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${this.appId}&app_key=${this.appKey}&what=${encodeURIComponent(query)}${loc}&results_per_page=20&content-type=application/json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Adzuna API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.results || [];

    return jobs.map((job: any): NormalizedJob => ({
      title: job.title || '',
      company_name: job.company?.display_name || '',
      company_logo_url: null,
      description: job.description || '',
      requirements: [],
      skills_required: this.extractTags(job.category?.tag || '', job.title || ''),
      location: job.location?.display_name || null,
      is_remote: (job.title || '').toLowerCase().includes('remote') || (job.description || '').toLowerCase().includes('remote'),
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      salary_currency: 'USD',
      job_type: job.contract_type === 'permanent' ? 'full_time' : job.contract_type || 'full_time',
      experience_level: this.guessExperienceLevel(job.title || ''),
      source_platform: 'adzuna',
      source_url: job.redirect_url || null,
      external_id: String(job.id),
      posted_at: job.created || new Date().toISOString(),
      metadata: { category: job.category },
    }));
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr.')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head of')) return 'lead';
    return 'mid';
  }

  private extractTags(category: string, title: string): string[] {
    const skills: string[] = [];
    if (category) skills.push(category);
    // Extract common technologies from title
    const techPatterns = ['Python', 'Java', 'React', 'Node', 'AWS', 'SQL', 'Docker', 'Kubernetes'];
    for (const tech of techPatterns) {
      if (title.toLowerCase().includes(tech.toLowerCase())) skills.push(tech);
    }
    return skills;
  }
}
