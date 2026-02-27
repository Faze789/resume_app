import type { IJobAdapter, NormalizedJob } from './types';

const httpFetch = globalThis.fetch;

/**
 * LinkedIn public jobs adapter.
 *
 * Strategy chain:
 *   1. Guest API (seeMoreJobPostings) — public endpoint that returns HTML job cards
 *   2. Public search page — parse JSON-LD structured data or HTML cards
 *
 * Country targeting is done via the `location` parameter which LinkedIn resolves
 * to GeoURN internally.
 */
export class LinkedInAdapter implements IJobAdapter {
  platformName = 'linkedin';
  requiresApiKey = false;

  // Desktop browser UA — LinkedIn is more permissive with desktop UAs than mobile
  private static HEADERS_DESKTOP = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  };

  // Mobile UA for guest API
  private static HEADERS_MOBILE = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
  };

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    // Strategy 1: Guest API (mobile UA — less likely to get blocked)
    const guestJobs = await this.tryGuestAPI(query, location);
    if (guestJobs.length > 0) return guestJobs;

    // Strategy 2: Public search page (desktop UA)
    const searchJobs = await this.trySearchPage(query, location);
    return searchJobs;
  }

  private async tryGuestAPI(query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({
      keywords: query,
      start: '0',
      sortBy: 'DD',  // sort by date
    });
    if (location) params.set('location', location);

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: LinkedInAdapter.HEADERS_MOBILE,
        redirect: 'follow',
      });

      if (!response.ok) {
        console.warn(`LinkedIn guest API: ${response.status}`);
        return [];
      }

      const html = await response.text();

      // Check if we got meaningful content
      if (html.length < 200 || html.includes('captcha') || html.includes('challenge')) {
        console.warn('LinkedIn guest API: challenge page');
        return [];
      }

      return this.parseJobCards(html);
    } catch (err: any) {
      console.warn('LinkedIn guest API failed:', err.message);
      return [];
    }
  }

  private async trySearchPage(query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ keywords: query });
    if (location) params.set('location', location);

    const url = `https://www.linkedin.com/jobs/search?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: LinkedInAdapter.HEADERS_DESKTOP,
        redirect: 'follow',
      });

      if (!response.ok) return [];

      const html = await response.text();

      if (html.length < 2000 || html.includes('captcha')) return [];

      // Try JSON-LD first (LinkedIn embeds structured data on public pages)
      const ldJobs = this.parseJsonLD(html);
      if (ldJobs.length > 0) return ldJobs;

      // Fallback to card parsing
      return this.parseJobCards(html);
    } catch (err: any) {
      console.warn('LinkedIn search page failed:', err.message);
      return [];
    }
  }

  private parseJobCards(html: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];
    const cards = html.split(/(?=<li\b)/i).filter(c => c.includes('base-card') || c.includes('job-search-card'));

    for (const card of cards.slice(0, 25)) {
      try {
        const job = this.parseOneCard(card);
        if (job) jobs.push(job);
      } catch { /* skip */ }
    }

    if (jobs.length > 0) {
      console.log(`LinkedIn: parsed ${jobs.length} job cards`);
    }
    return jobs;
  }

  private parseOneCard(card: string): NormalizedJob | null {
    // Extract job URL and ID
    const urlMatch = card.match(/href="(https:\/\/\w+\.linkedin\.com\/jobs\/view\/[^"?]+)/);
    const jobUrl = urlMatch?.[1] || null;
    const idMatch = jobUrl?.match(/\/view\/([^/?]+)/);
    const jobId = idMatch?.[1] || `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Extract title
    let title = '';
    const titlePatterns = [
      /base-search-card__title[^>]*>([^<]+)/,
      /job-search-card[\s\S]*?<span[^>]*>([^<]{3,80})<\/span>/,
      /sr-only[^>]*>([^<]{3,80})<\/span>/,
    ];
    for (const p of titlePatterns) {
      const m = card.match(p);
      if (m?.[1]) { title = this.clean(m[1]); break; }
    }
    if (!title) return null;

    // Extract company name
    const companyPatterns = [
      /base-search-card__subtitle[\s\S]*?>([\s\S]*?)<\/a>/,
      /base-search-card__subtitle[^>]*>([\s\S]*?)</,
      /hidden-nested-link[^>]*>([\s\S]*?)</,
    ];
    let company = '';
    for (const p of companyPatterns) {
      const m = card.match(p);
      if (m?.[1]) { company = this.clean(m[1]); break; }
    }

    // Extract location
    const locPatterns = [
      /job-search-card__location[^>]*>([\s\S]*?)</,
      /base-search-card__metadata[^>]*>([\s\S]*?)</,
    ];
    let location = '';
    for (const p of locPatterns) {
      const m = card.match(p);
      if (m?.[1]) { location = this.clean(m[1]); break; }
    }

    // Extract date
    const dateMatch = card.match(/datetime="([^"]+)"/);
    const postedAt = dateMatch?.[1] || new Date().toISOString();

    // Extract logo
    const logoMatch = card.match(/data-delayed-url="([^"]+)"/) || card.match(/src="(https:\/\/media\.licdn[^"]+)"/);
    const logo = logoMatch?.[1] || null;

    const isRemote = this.isRemote(location, title);

    return {
      title,
      company_name: company || 'Unknown',
      company_logo_url: logo,
      description: '',
      requirements: [],
      skills_required: this.extractSkills(title),
      location: location || null,
      is_remote: isRemote,
      salary_min: null,
      salary_max: null,
      salary_currency: 'USD',
      job_type: this.guessJobType(title),
      experience_level: this.guessExperienceLevel(title),
      source_platform: 'linkedin',
      source_url: jobUrl,
      external_id: jobId,
      posted_at: postedAt,
      metadata: { source: 'linkedin_guest' },
    };
  }

  private parseJsonLD(html: string): NormalizedJob[] {
    try {
      const items: any[] = [];
      const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed['@type'] === 'JobPosting') items.push(parsed);
          if (parsed['@type'] === 'ItemList' && parsed.itemListElement) {
            for (const el of parsed.itemListElement) {
              const job = el.item || el;
              if (job['@type'] === 'JobPosting') items.push(job);
            }
          }
        } catch { /* skip */ }
      }

      return items.filter(j => j.title).map((job: any): NormalizedJob => ({
        title: job.title || '',
        company_name: job.hiringOrganization?.name || '',
        company_logo_url: job.hiringOrganization?.logo || null,
        description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000),
        requirements: [],
        skills_required: this.extractSkills(`${job.title} ${job.description || ''}`),
        location: this.formatLoc(job.jobLocation),
        is_remote: job.jobLocationType === 'TELECOMMUTE',
        salary_min: job.baseSalary?.value?.minValue ? Number(job.baseSalary.value.minValue) : null,
        salary_max: job.baseSalary?.value?.maxValue ? Number(job.baseSalary.value.maxValue) : null,
        salary_currency: job.baseSalary?.currency || 'USD',
        job_type: this.mapEmploymentType(job.employmentType),
        experience_level: this.guessExperienceLevel(job.title || ''),
        source_platform: 'linkedin',
        source_url: job.url || null,
        external_id: job.identifier?.value || `li-ld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        posted_at: job.datePosted || new Date().toISOString(),
        metadata: { source: 'linkedin_jsonld' },
      }));
    } catch {
      return [];
    }
  }

  // ── Helpers ──

  private clean(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isRemote(location: string, title: string): boolean {
    const text = `${location} ${title}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home');
  }

  private formatLoc(loc: any): string | null {
    if (!loc) return null;
    if (typeof loc === 'string') return loc;
    if (Array.isArray(loc)) return loc.map((l: any) => l.address?.addressLocality || '').filter(Boolean).join(', ') || null;
    const a = loc.address || loc;
    return [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(', ') || null;
  }

  private mapEmploymentType(type: any): string {
    if (!type) return 'full_time';
    const s = (Array.isArray(type) ? type[0] : type).toString().toUpperCase();
    if (s.includes('FULL')) return 'full_time';
    if (s.includes('PART')) return 'part_time';
    if (s.includes('CONTRACT')) return 'contract';
    if (s.includes('INTERN')) return 'internship';
    return 'full_time';
  }

  private guessJobType(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('part time') || lower.includes('part-time')) return 'part_time';
    if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
    return 'full_time';
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr.') || lower.includes('graduate')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head of') || lower.includes('manager')) return 'lead';
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('cto')) return 'executive';
    return 'mid';
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase();
    const skills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Django', 'Flask', 'Spring',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'Git', 'REST', 'GraphQL', 'Machine Learning', 'AI', 'DevOps',
      'React Native', 'Flutter', 'iOS', 'Android', '.NET', 'PHP', 'Ruby', 'Scala',
    ];
    return skills.filter((s) => lower.includes(s.toLowerCase()));
  }
}
