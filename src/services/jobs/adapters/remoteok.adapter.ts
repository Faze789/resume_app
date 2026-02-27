import type { IJobAdapter, NormalizedJob } from './types';

export class RemoteOKAdapter implements IJobAdapter {
  platformName = 'remoteok';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    // Extract the first meaningful keyword for tag-based filtering
    const tag = this.extractTag(query);
    const params = tag ? `?tags=${encodeURIComponent(tag)}` : '';
    const url = `https://remoteok.com/api${params}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'JobMatch/1.0' },
    });
    if (!response.ok) throw new Error(`RemoteOK API error: ${response.status}`);

    const data = await response.json();
    // First element is metadata, rest are jobs
    const jobs = (Array.isArray(data) ? data : []).filter((j: any) => j.position);

    return jobs.slice(0, 50).map((job: any): NormalizedJob => ({
      title: job.position || '',
      company_name: job.company || '',
      company_logo_url: job.company_logo || job.logo || null,
      description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      requirements: [],
      skills_required: this.extractSkills(job.tags || []),
      location: job.location || 'Remote',
      is_remote: true,
      salary_min: job.salary_min > 0 ? job.salary_min : null,
      salary_max: job.salary_max > 0 ? job.salary_max : null,
      salary_currency: 'USD',
      job_type: 'full_time',
      experience_level: this.guessExperienceLevel(job.position || '', job.tags || []),
      source_platform: 'remoteok',
      source_url: job.url || job.apply_url || null,
      external_id: String(job.id || job.slug),
      posted_at: job.date || new Date().toISOString(),
      metadata: { tags: job.tags },
    }));
  }

  private extractTag(query: string): string {
    // Take the first word that looks like a tech skill/role
    const words = query.toLowerCase().split(/\s+/);
    const techTerms = [
      'react', 'angular', 'vue', 'node', 'python', 'java', 'typescript', 'javascript',
      'golang', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'flutter', 'aws',
      'devops', 'frontend', 'backend', 'fullstack', 'ios', 'android', 'data', 'ml',
      'ai', 'design', 'product', 'marketing', 'sales', 'engineer', 'developer',
      'docker', 'kubernetes', 'cloud', 'security', 'qa', 'testing',
    ];
    const match = words.find(w => techTerms.includes(w));
    return match || words[0] || '';
  }

  private extractSkills(tags: string[]): string[] {
    const skillTags = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'php',
      'swift', 'kotlin', 'react', 'angular', 'vue', 'node', 'django', 'flask',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'mongodb', 'postgresql',
      'git', 'devops', 'graphql', 'redis', 'elasticsearch', 'terraform',
    ];
    return tags
      .filter(t => skillTags.includes(t.toLowerCase()))
      .map(t => t.charAt(0).toUpperCase() + t.slice(1));
  }

  private guessExperienceLevel(title: string, tags: string[]): string {
    const text = `${title} ${tags.join(' ')}`.toLowerCase();
    if (text.includes('intern') || text.includes('junior') || text.includes('entry') || text.includes('jr.')) return 'entry';
    if (text.includes('senior') || text.includes('sr.') || text.includes('staff') || text.includes('principal')) return 'senior';
    if (text.includes('lead') || text.includes('director') || text.includes('head of') || text.includes('vp')) return 'lead';
    if (text.includes('chief') || text.includes('executive') || text.includes('cto')) return 'executive';
    return 'mid';
  }
}
