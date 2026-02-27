import type { IJobAdapter, NormalizedJob } from './types';

/**
 * The Muse — Free public job API (no key for basic access).
 * Docs: https://www.themuse.com/developers/api/v2
 * Returns tech and non-tech roles from well-known companies.
 */
export class TheMuseAdapter implements IJobAdapter {
  platformName = 'themuse';
  requiresApiKey = false;

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ page: '0' });
    if (query) params.set('category', this.mapCategory(query));
    if (location) params.set('location', location);

    const url = `https://www.themuse.com/api/public/jobs?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TheMuse API error: ${response.status}`);

    const data = await response.json();
    const jobs = (data.results || []).slice(0, 25);

    return jobs.map((job: any): NormalizedJob => {
      const locationStr = (job.locations || []).map((l: any) => l.name).join(', ') || null;
      const isRemote = locationStr
        ? locationStr.toLowerCase().includes('remote') || locationStr.toLowerCase().includes('flexible')
        : false;

      return {
        title: job.name || '',
        company_name: job.company?.name || '',
        company_logo_url: null,
        description: this.cleanHtml(job.contents || ''),
        requirements: [],
        skills_required: this.extractSkills(job.contents || '', job.categories || []),
        location: locationStr,
        is_remote: isRemote,
        salary_min: null,
        salary_max: null,
        salary_currency: 'USD',
        job_type: this.mapJobType(job.levels || []),
        experience_level: this.mapExperienceLevel(job.levels || [], job.name || ''),
        source_platform: 'themuse',
        source_url: job.refs?.landing_page || null,
        external_id: String(job.id),
        posted_at: job.publication_date || new Date().toISOString(),
        metadata: { categories: (job.categories || []).map((c: any) => c.name) },
      };
    });
  }

  private cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
  }

  private mapCategory(query: string): string {
    const lower = query.toLowerCase();
    if (lower.includes('data') || lower.includes('analytics')) return 'Data and Analytics';
    if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) return 'Design and UX';
    if (lower.includes('product') || lower.includes('pm')) return 'Product';
    if (lower.includes('marketing')) return 'Marketing and PR';
    if (lower.includes('science') || lower.includes('research')) return 'Data Science';
    return 'Software Engineering';
  }

  private mapJobType(levels: any[]): string {
    const names = levels.map((l: any) => (l.name || '').toLowerCase());
    if (names.some((n) => n.includes('intern'))) return 'internship';
    if (names.some((n) => n.includes('part'))) return 'part_time';
    return 'full_time';
  }

  private mapExperienceLevel(levels: any[], title: string): string {
    const names = levels.map((l: any) => (l.name || l.short_name || '').toLowerCase());
    const titleLower = title.toLowerCase();

    if (names.some((n) => n.includes('intern')) || titleLower.includes('intern')) return 'entry';
    if (names.some((n) => n.includes('entry') || n.includes('junior')) || titleLower.includes('junior')) return 'entry';
    if (names.some((n) => n.includes('senior')) || titleLower.includes('senior') || titleLower.includes('sr.')) return 'senior';
    if (names.some((n) => n.includes('management') || n.includes('director')) || titleLower.includes('lead')) return 'lead';
    return 'mid';
  }

  private extractSkills(desc: string, categories: any[]): string[] {
    const skills: string[] = [];
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'Git', 'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'Ruby', 'PHP',
      'Flutter', 'React Native', 'iOS', 'Android', 'DevOps', 'Terraform',
    ];
    const descLower = desc.toLowerCase();
    for (const skill of commonSkills) {
      if (descLower.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
    return skills.slice(0, 15);
  }
}
