import type { IJobAdapter, NormalizedJob } from './types';

export class JoinRiseAdapter implements IJobAdapter {
  platformName = 'joinrise';
  requiresApiKey = false;

  async fetch(query: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({
      page: '1',
      limit: '30',
      sort: 'desc',
      sortedBy: 'createdAt',
    });

    if (query) params.set('search', query);

    // Also filter by tech departments for more relevant results
    params.set('department', 'Software Engineering');

    const url = `https://api.joinrise.io/api/v1/jobs/public?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`JoinRise API error: ${response.status}`);

    const data = await response.json();
    const jobs = data.result?.jobs || [];

    return jobs.map((job: any): NormalizedJob => {
      const breakdown = job.descriptionBreakdown || {};
      const workModel = (breakdown.workModel || job.type || '').toLowerCase();

      return {
        title: job.title || '',
        company_name: job.owner?.companyName || '',
        company_logo_url: job.owner?.photo || null,
        description: breakdown.oneSentenceJobSummary || job.title || '',
        requirements: (job.skills_suggest || []).slice(0, 5),
        skills_required: (breakdown.keywords || []).slice(0, 10),
        location: job.locationAddress || null,
        is_remote: workModel.includes('remote'),
        salary_min: breakdown.salaryRangeMinYearly ? Number(breakdown.salaryRangeMinYearly) : null,
        salary_max: breakdown.salaryRangeMaxYearly ? Number(breakdown.salaryRangeMaxYearly) : null,
        salary_currency: 'USD',
        job_type: this.mapJobType(breakdown.employmentType || job.type),
        experience_level: this.mapSeniority(job.seniority),
        source_platform: 'joinrise',
        source_url: job.url || null,
        external_id: job._id || String(Date.now()),
        posted_at: job.createdAt || new Date().toISOString(),
        metadata: { department: job.department, workModel: breakdown.workModel },
      };
    });
  }

  private mapSeniority(seniority: string): string {
    if (!seniority) return 'mid';
    const lower = seniority.toLowerCase();
    if (lower.includes('entry') || lower.includes('junior') || lower.includes('intern')) return 'entry';
    if (lower.includes('senior') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('manager') || lower.includes('director')) return 'lead';
    if (lower.includes('executive') || lower.includes('vp') || lower.includes('chief')) return 'executive';
    return 'mid';
  }

  private mapJobType(type: string): string {
    if (!type) return 'full_time';
    const lower = type.toLowerCase();
    if (lower.includes('part')) return 'part_time';
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('freelance')) return 'freelance';
    return 'full_time';
  }
}
