import type { IJobAdapter, NormalizedJob } from './types';

/**
 * Himalayas.app — Free remote jobs API, no key required.
 * Docs: https://himalayas.app/api
 */
export class HimalayasAdapter implements IJobAdapter {
  platformName = 'himalayas';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    const url = `https://himalayas.app/jobs/api?limit=25&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Himalayas API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.jobs || [];

    return jobs.map((job: any): NormalizedJob => ({
      title: job.title || '',
      company_name: job.companyName || job.company_name || '',
      company_logo_url: job.companyLogo || null,
      description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000),
      requirements: [],
      skills_required: this.extractSkills(job.categories || [], job.tags || [], job.description || ''),
      location: job.location || null,
      is_remote: true,
      salary_min: job.minSalary || null,
      salary_max: job.maxSalary || null,
      salary_currency: job.salaryCurrency || 'USD',
      job_type: this.mapJobType(job.type || ''),
      experience_level: this.guessExperienceLevel(job.title || '', job.seniority || ''),
      source_platform: 'himalayas',
      source_url: job.applicationUrl || job.url || null,
      external_id: String(job.id || job.slug || `${job.title}-${job.companyName}`),
      posted_at: job.pubDate || job.publishedAt || job.created_at || new Date().toISOString(),
      metadata: { categories: job.categories, tags: job.tags },
    }));
  }

  private extractSkills(categories: string[], tags: string[], desc: string): string[] {
    const skills: string[] = [];
    for (const tag of [...categories, ...tags]) {
      if (tag && tag.length > 1 && tag.length < 30) skills.push(tag);
    }
    if (skills.length < 3) {
      const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
        'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
        'Go', 'Rust', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
        'Vue', 'Angular', 'GraphQL', 'REST', 'CI/CD', 'Git',
      ];
      for (const skill of commonSkills) {
        if (desc.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
          skills.push(skill);
        }
      }
    }
    return skills.slice(0, 15);
  }

  private guessExperienceLevel(title: string, seniority: string): string {
    const check = `${title} ${seniority}`.toLowerCase();
    if (check.includes('intern') || check.includes('junior') || check.includes('entry') || check.includes('jr.')) return 'entry';
    if (check.includes('senior') || check.includes('sr.') || check.includes('staff') || check.includes('principal')) return 'senior';
    if (check.includes('lead') || check.includes('director') || check.includes('head of') || check.includes('manager')) return 'lead';
    if (check.includes('vp') || check.includes('chief') || check.includes('executive')) return 'executive';
    return 'mid';
  }

  private mapJobType(type: string): string {
    const lower = (type || '').toLowerCase();
    if (lower.includes('full')) return 'full_time';
    if (lower.includes('part')) return 'part_time';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('freelance')) return 'freelance';
    return 'full_time';
  }
}
