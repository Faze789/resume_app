import type { IJobAdapter, NormalizedJob } from './types';

export class SearchAPIAdapter implements IJobAdapter {
  platformName = 'searchapi';
  requiresApiKey = true;

  constructor(private apiKey: string) {}

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({
      engine: 'google_jobs',
      q: query,
      api_key: this.apiKey,
    });
    if (location) params.set('location', location);

    const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`SearchAPI error: ${response.status}`);

    const data = await response.json();
    const jobs: any[] = data.jobs || [];

    return jobs.slice(0, 30).map((job: any): NormalizedJob => {
      const ext = job.detected_extensions || {};
      const highlights = Array.isArray(job.job_highlights) ? job.job_highlights : [];
      const qualifications = highlights.find((h: any) => h.title === 'Qualifications');
      const responsibilities = highlights.find((h: any) => h.title === 'Responsibilities');

      return {
        title: job.title || '',
        company_name: job.company_name || '',
        company_logo_url: job.thumbnail || null,
        description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        requirements: qualifications?.items || [],
        skills_required: this.extractSkillsFromText(
          `${job.description || ''} ${(qualifications?.items || []).join(' ')}`
        ),
        location: job.location || null,
        is_remote: ext.work_from_home === true || this.isRemoteFromText(job.location, job.title),
        salary_min: this.parseSalaryMin(ext.salary),
        salary_max: this.parseSalaryMax(ext.salary),
        salary_currency: 'USD',
        job_type: this.mapScheduleType(ext.schedule),
        experience_level: this.guessExperienceLevel(job.title || '', qualifications?.items || []),
        source_platform: 'searchapi',
        source_url: job.apply_link || (job.apply_links?.[0]?.link) || job.sharing_link || null,
        external_id: job.sharing_link || `searchapi-${(job.title || '').slice(0, 30)}-${job.company_name || ''}`,
        posted_at: this.parsePostedAt(ext.posted_at),
        metadata: {
          via: job.via,
          extensions: job.extensions,
          responsibilities: responsibilities?.items,
        },
      };
    });
  }

  private extractSkillsFromText(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Django', 'Flask', 'Spring', 'Express',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL', 'Redis',
      'Git', 'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'AI', 'Terraform', 'Linux',
      'HTML', 'CSS', 'Sass', 'Tailwind', 'React Native', 'Flutter', 'Figma',
    ];
    const lower = text.toLowerCase();
    return commonSkills.filter((skill) => lower.includes(skill.toLowerCase()));
  }

  private isRemoteFromText(location: string | undefined, title: string): boolean {
    const text = `${location || ''} ${title}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('anywhere');
  }

  private parseSalaryMin(salary: string | undefined): number | null {
    if (!salary) return null;
    const numbers = salary.replace(/[,$]/g, '').match(/\d+\.?\d*/g);
    if (!numbers || numbers.length === 0) return null;
    const val = parseFloat(numbers[0]);
    // If it looks like hourly (< 500), convert to annual estimate
    return val < 500 ? Math.round(val * 2080) : val;
  }

  private parseSalaryMax(salary: string | undefined): number | null {
    if (!salary) return null;
    const numbers = salary.replace(/[,$]/g, '').match(/\d+\.?\d*/g);
    if (!numbers || numbers.length < 2) return null;
    const val = parseFloat(numbers[1]);
    return val < 500 ? Math.round(val * 2080) : val;
  }

  private mapScheduleType(schedule: string | undefined): string {
    if (!schedule) return 'full_time';
    const lower = schedule.toLowerCase();
    if (lower.includes('full')) return 'full_time';
    if (lower.includes('part')) return 'part_time';
    if (lower.includes('contract') || lower.includes('temporary')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('freelance')) return 'freelance';
    return 'full_time';
  }

  private guessExperienceLevel(title: string, qualifications: string[]): string {
    const text = `${title} ${qualifications.join(' ')}`.toLowerCase();
    if (text.includes('intern') || text.includes('junior') || text.includes('entry') || text.includes('jr.')) return 'entry';
    if (text.includes('senior') || text.includes('sr.') || text.includes('staff') || text.includes('principal')) return 'senior';
    if (text.includes('lead') || text.includes('director') || text.includes('head of') || text.includes('vp')) return 'lead';
    if (text.includes('chief') || text.includes('executive') || text.includes('cto')) return 'executive';
    // Also check for years of experience mentions
    const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1], 10);
      if (years <= 2) return 'entry';
      if (years <= 5) return 'mid';
      if (years <= 10) return 'senior';
      return 'lead';
    }
    return 'mid';
  }

  private parsePostedAt(posted: string | undefined): string {
    if (!posted) return new Date().toISOString();
    // e.g. "5 days ago", "1 hour ago", "30+ days ago"
    const match = posted.match(/(\d+)\s*(hour|day|week|month)/i);
    if (!match) return new Date().toISOString();
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const now = new Date();
    if (unit.startsWith('hour')) now.setHours(now.getHours() - value);
    else if (unit.startsWith('day')) now.setDate(now.getDate() - value);
    else if (unit.startsWith('week')) now.setDate(now.getDate() - value * 7);
    else if (unit.startsWith('month')) now.setMonth(now.getMonth() - value);
    return now.toISOString();
  }
}
