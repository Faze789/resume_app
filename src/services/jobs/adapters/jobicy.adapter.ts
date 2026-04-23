import type { IJobAdapter, NormalizedJob } from './types';

export class JobicyAdapter implements IJobAdapter {
  platformName = 'jobicy';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ count: '50' });
    if (query) params.set('tag', query);

    const url = `https://jobicy.com/api/v2/remote-jobs?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Jobicy API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.jobs || [];

    return jobs.slice(0, 25).map((job: any): NormalizedJob => ({
      title: job.jobTitle || '',
      company_name: job.companyName || '',
      company_logo_url: job.companyLogo || null,
      description: (job.jobDescription || job.jobExcerpt || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      requirements: [],
      skills_required: this.extractSkills(job.jobDescription || ''),
      location: job.jobGeo || 'Remote',
      is_remote: true,
      salary_min: job.annualSalaryMin ? parseFloat(job.annualSalaryMin) : null,
      salary_max: job.annualSalaryMax ? parseFloat(job.annualSalaryMax) : null,
      salary_currency: job.salaryCurrency || 'USD',
      job_type: this.mapJobType(job.jobType),
      experience_level: this.mapExperienceLevel(job.jobLevel, job.jobTitle || ''),
      source_platform: 'jobicy',
      source_url: job.url || null,
      external_id: String(job.id),
      posted_at: job.pubDate || new Date().toISOString(),
      metadata: { industry: job.jobIndustry },
    }));
  }

  private mapJobType(type: string): string {
    if (!type) return 'full_time';
    const lower = type.toLowerCase();
    if (lower.includes('full')) return 'full_time';
    if (lower.includes('part')) return 'part_time';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('freelance')) return 'freelance';
    return 'full_time';
  }

  private mapExperienceLevel(level: string, title: string): string {
    if (level) {
      const lower = level.toLowerCase();
      if (lower.includes('entry') || lower.includes('junior')) return 'entry';
      if (lower.includes('senior') || lower.includes('sr')) return 'senior';
      if (lower.includes('lead') || lower.includes('manager') || lower.includes('director')) return 'lead';
      if (lower.includes('executive') || lower.includes('vp') || lower.includes('chief')) return 'executive';
      if (lower.includes('mid')) return 'mid';
    }
    // Fallback: guess from title
    const titleLower = title.toLowerCase();
    if (titleLower.includes('intern') || titleLower.includes('junior') || titleLower.includes('jr.')) return 'entry';
    if (titleLower.includes('senior') || titleLower.includes('sr.') || titleLower.includes('staff')) return 'senior';
    if (titleLower.includes('lead') || titleLower.includes('director')) return 'lead';
    return 'mid';
  }

  private extractSkills(desc: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'Git', 'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'Ruby', 'PHP',
    ];
    return commonSkills.filter((skill) =>
      desc.toLowerCase().includes(skill.toLowerCase())
    );
  }
}
