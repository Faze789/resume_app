import type { IJobAdapter, NormalizedJob } from './types';

export class JoobleAdapter implements IJobAdapter {
  platformName = 'jooble';
  requiresApiKey = true;

  constructor(private apiKey: string) {}

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const url = `https://jooble.org/api/${this.apiKey}`;

    const body: Record<string, string> = { keywords: query, page: '1' };
    if (location) body.location = location;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Jooble API error: ${response.status}`);

    const data = await response.json();
    const jobs: any[] = data.jobs || [];

    return jobs.slice(0, 50).map((job: any): NormalizedJob => ({
      title: job.title || '',
      company_name: job.company || '',
      company_logo_url: null,
      description: (job.snippet || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      requirements: [],
      skills_required: this.extractSkillsFromDescription(job.snippet || ''),
      location: job.location || null,
      is_remote: this.isRemoteJob(job.location, job.title),
      salary_min: this.parseSalaryMin(job.salary),
      salary_max: this.parseSalaryMax(job.salary),
      salary_currency: 'USD',
      job_type: this.mapJobType(job.type),
      experience_level: this.guessExperienceLevel(job.title || ''),
      source_platform: 'jooble',
      source_url: job.link || null,
      external_id: job.id ? String(job.id) : `jooble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      posted_at: job.updated || new Date().toISOString(),
      metadata: { source: job.source },
    }));
  }

  private extractSkillsFromDescription(desc: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'Git', 'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'AI',
    ];
    return commonSkills.filter((skill) =>
      desc.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private isRemoteJob(location: string | undefined, title: string): boolean {
    const text = `${location || ''} ${title}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
  }

  private parseSalaryMin(salary: string | undefined): number | null {
    if (!salary) return null;
    const numbers = salary.replace(/[^0-9.]/g, ' ').trim().split(/\s+/).map(Number).filter(n => n > 0);
    return numbers.length > 0 ? numbers[0] : null;
  }

  private parseSalaryMax(salary: string | undefined): number | null {
    if (!salary) return null;
    const numbers = salary.replace(/[^0-9.]/g, ' ').trim().split(/\s+/).map(Number).filter(n => n > 0);
    return numbers.length > 1 ? numbers[1] : null;
  }

  private mapJobType(type: string | undefined): string {
    if (!type) return 'full_time';
    const lower = type.toLowerCase();
    if (lower.includes('full')) return 'full_time';
    if (lower.includes('part')) return 'part_time';
    if (lower.includes('contract') || lower.includes('temporary')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('freelance')) return 'freelance';
    return 'full_time';
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr.')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head of') || lower.includes('vp')) return 'lead';
    if (lower.includes('chief') || lower.includes('executive') || lower.includes('cto')) return 'executive';
    return 'mid';
  }
}
