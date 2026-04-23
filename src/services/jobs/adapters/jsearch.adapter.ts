import type { IJobAdapter, NormalizedJob } from './types';

export class JSearchAdapter implements IJobAdapter {
  platformName = 'jsearch';
  requiresApiKey = true;

  constructor(private apiKey: string) {}

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const searchQuery = location ? `${query} in ${location}` : query;
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1`;

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });

    if (!response.ok) throw new Error(`JSearch API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.data || [];

    return jobs.map((job: any): NormalizedJob => ({
      title: job.job_title || '',
      company_name: job.employer_name || '',
      company_logo_url: job.employer_logo || null,
      description: job.job_description || '',
      requirements: (job.job_highlights?.Qualifications || []),
      skills_required: this.extractSkillsFromDescription(job.job_description || ''),
      location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || null,
      is_remote: job.job_is_remote === true,
      salary_min: job.job_min_salary || null,
      salary_max: job.job_max_salary || null,
      salary_currency: job.job_salary_currency || 'USD',
      job_type: this.mapJobType(job.job_employment_type),
      experience_level: this.guessExperienceLevel(job.job_title || ''),
      source_platform: 'jsearch',
      source_url: job.job_apply_link || null,
      external_id: job.job_id || String(Date.now()),
      posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
      metadata: {
        publisher: job.job_publisher,
        benefits: job.job_highlights?.Benefits,
      },
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

  private mapJobType(type: string): string {
    const map: Record<string, string> = {
      FULLTIME: 'full_time',
      PARTTIME: 'part_time',
      CONTRACTOR: 'contract',
      INTERN: 'internship',
    };
    return map[type] || 'full_time';
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff')) return 'senior';
    if (lower.includes('lead') || lower.includes('principal') || lower.includes('director')) return 'lead';
    return 'mid';
  }
}
