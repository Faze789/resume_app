import type { IJobAdapter, NormalizedJob } from './types';

const httpFetch = globalThis.fetch;

/**
 * CareerJet adapter — scrapes CareerJet.com for country-specific job listings.
 *
 * CareerJet aggregates jobs from company websites, job boards, and newspapers
 * across 90+ countries. It has lighter anti-bot protection than Indeed/LinkedIn.
 *
 * Uses country-specific domains (careerjet.pk, careerjet.co.in, etc.)
 * with public HTML search results.
 */
export class CareerJetAdapter implements IJobAdapter {
  platformName = 'careerjet';
  requiresApiKey = false;

  private static COUNTRY_DOMAINS: Record<string, string> = {
    pakistan: 'careerjet.pk',
    india: 'careerjet.co.in',
    uk: 'careerjet.co.uk',
    'united kingdom': 'careerjet.co.uk',
    canada: 'careerjet.ca',
    australia: 'careerjet.com.au',
    germany: 'careerjet.de',
    france: 'careerjet.fr',
    italy: 'careerjet.it',
    netherlands: 'careerjet.nl',
    spain: 'careerjet.es',
    brazil: 'careerjet.com.br',
    mexico: 'careerjet.com.mx',
    japan: 'careerjet.jp',
    singapore: 'careerjet.com.sg',
    'south africa': 'careerjet.co.za',
    nigeria: 'careerjet.com.ng',
    egypt: 'careerjet.com.eg',
    'saudi arabia': 'careerjet.com.sa',
    uae: 'careerjet.ae',
    'united arab emirates': 'careerjet.ae',
    qatar: 'careerjet.com.qa',
    malaysia: 'careerjet.com.my',
    philippines: 'careerjet.ph',
    indonesia: 'careerjet.co.id',
    turkey: 'careerjet.com.tr',
    ireland: 'careerjet.ie',
    sweden: 'careerjet.se',
    'new zealand': 'careerjet.co.nz',
    china: 'careerjet.cn',
    'hong kong': 'careerjet.hk',
    usa: 'careerjet.com',
    'united states': 'careerjet.com',
    us: 'careerjet.com',
  };

  private static HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
  };

  private getDomain(location?: string): string {
    if (!location) return 'careerjet.com';
    const lower = location.toLowerCase();
    for (const [country, domain] of Object.entries(CareerJetAdapter.COUNTRY_DOMAINS)) {
      if (lower.includes(country)) return domain;
    }
    return 'careerjet.com';
  }

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const domain = this.getDomain(location);

    // Extract city from location for the location parameter
    const city = location ? location.split(',')[0].trim() : '';

    const params = new URLSearchParams({ s: query, sort: 'date', radius: '50' });
    if (city) params.set('l', city);

    const url = `https://www.${domain}/search/jobs?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: CareerJetAdapter.HEADERS,
        redirect: 'follow',
      });

      if (!response.ok) {
        console.warn(`CareerJet ${response.status} from ${domain}`);
        return [];
      }

      const html = await response.text();

      // Check for valid HTML with job listings
      if (html.length < 2000 || html.includes('captcha')) {
        console.warn('CareerJet: empty or challenge page');
        return [];
      }

      const jobs = this.parseJobListings(html, domain);
      if (jobs.length > 0) {
        console.log(`CareerJet: ${jobs.length} jobs from ${domain}`);
      }
      return jobs;
    } catch (err: any) {
      console.warn(`CareerJet error (${domain}):`, err.message);
      return [];
    }
  }

  private parseJobListings(html: string, domain: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];

    // CareerJet uses <article> tags or <div class="job"> for job cards
    // Pattern 1: article-based cards
    const articlePattern = /<article[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = articlePattern.exec(html)) !== null && jobs.length < 25) {
      const card = match[1];
      const job = this.parseCard(card, domain);
      if (job) jobs.push(job);
    }

    if (jobs.length > 0) return jobs;

    // Pattern 2: div-based job listings
    const divPattern = /<div[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*job|$)/gi;
    while ((match = divPattern.exec(html)) !== null && jobs.length < 25) {
      const card = match[1];
      const job = this.parseCard(card, domain);
      if (job) jobs.push(job);
    }

    if (jobs.length > 0) return jobs;

    // Pattern 3: Generic link-based extraction
    // Look for job title links with nearby company and location info
    const linkPattern = /<a[^>]*href="(\/job\/[^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?(?:company|employer)[^>]*>([^<]+)<[\s\S]*?(?:location|place)[^>]*>([^<]+)</gi;
    while ((match = linkPattern.exec(html)) !== null && jobs.length < 25) {
      const [, href, title, company, loc] = match;
      if (!title?.trim()) continue;

      jobs.push({
        title: this.clean(title),
        company_name: this.clean(company) || 'Unknown',
        company_logo_url: null,
        description: '',
        requirements: [],
        skills_required: this.extractSkills(title),
        location: this.clean(loc) || null,
        is_remote: this.isRemote(loc, title),
        salary_min: null,
        salary_max: null,
        salary_currency: 'USD',
        job_type: this.guessJobType(title),
        experience_level: this.guessLevel(title),
        source_platform: 'careerjet',
        source_url: `https://www.${domain}${href}`,
        external_id: `cj-${this.hashStr(title + company)}`,
        posted_at: new Date().toISOString(),
        metadata: { source: 'careerjet', domain },
      });
    }

    return jobs;
  }

  private parseCard(card: string, domain: string): NormalizedJob | null {
    // Extract title from first meaningful link or heading
    const titleMatch = card.match(/<(?:a|h2|h3|h4)[^>]*>[\s\S]*?<(?:a[^>]*href="([^"]*)"[^>]*>)?[\s\S]*?([^<]{3,100}?)[\s\S]*?<\/(?:a|h2|h3|h4)>/i)
      || card.match(/<a[^>]*href="([^"]*)"[^>]*>\s*([^<]{3,100}?)\s*<\/a>/i);

    if (!titleMatch) return null;

    const href = titleMatch[1] || '';
    const title = this.clean(titleMatch[2] || '');
    if (!title || title.length < 3) return null;

    // Extract company
    const companyMatch = card.match(/(?:company|employer|name)[^>]*>\s*([^<]+)/i)
      || card.match(/<p[^>]*>\s*(?:at\s+)?([A-Z][^<]{2,50})\s*<\/p>/i);
    const company = companyMatch ? this.clean(companyMatch[1]) : '';

    // Extract location
    const locMatch = card.match(/(?:location|place|city)[^>]*>\s*([^<]+)/i)
      || card.match(/(?:loc|place)[\s\S]{0,30}>([^<]{3,60})</i);
    const location = locMatch ? this.clean(locMatch[1]) : null;

    // Extract date
    const dateMatch = card.match(/(?:date|time|posted|ago)[^>]*>\s*([^<]+)/i);
    const dateStr = dateMatch ? dateMatch[1].trim() : '';

    // Extract salary
    const salaryMatch = card.match(/(?:salary|pay|compensation)[^>]*>\s*([^<]+)/i);

    const jobUrl = href.startsWith('/') ? `https://www.${domain}${href}` :
                   href.startsWith('http') ? href : null;

    return {
      title,
      company_name: company || 'Unknown',
      company_logo_url: null,
      description: '',
      requirements: [],
      skills_required: this.extractSkills(title),
      location,
      is_remote: this.isRemote(location, title),
      salary_min: salaryMatch ? this.parseSalary(salaryMatch[1], 'min') : null,
      salary_max: salaryMatch ? this.parseSalary(salaryMatch[1], 'max') : null,
      salary_currency: 'USD',
      job_type: this.guessJobType(title),
      experience_level: this.guessLevel(title),
      source_platform: 'careerjet',
      source_url: jobUrl,
      external_id: `cj-${this.hashStr(title + company)}`,
      posted_at: this.parseRelDate(dateStr),
      metadata: { source: 'careerjet', domain },
    };
  }

  // ── Helpers ──

  private clean(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isRemote(location: string | null, title: string): boolean {
    const text = `${location || ''} ${title}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home');
  }

  private guessJobType(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('part time') || lower.includes('part-time')) return 'part_time';
    if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
    return 'full_time';
  }

  private guessLevel(title: string): string {
    const l = title.toLowerCase();
    if (l.includes('intern') || l.includes('junior') || l.includes('entry') || l.includes('jr.') || l.includes('graduate')) return 'entry';
    if (l.includes('senior') || l.includes('sr.') || l.includes('staff') || l.includes('principal')) return 'senior';
    if (l.includes('lead') || l.includes('director') || l.includes('head of') || l.includes('manager')) return 'lead';
    return 'mid';
  }

  private extractSkills(text: string): string[] {
    const lower = text.toLowerCase();
    const skills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Django', 'Flask', 'Spring',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'React Native', 'Flutter', 'iOS', 'Android', '.NET', 'PHP', 'Ruby', 'Scala',
    ];
    return skills.filter((s) => lower.includes(s.toLowerCase()));
  }

  private parseSalary(text: string, type: 'min' | 'max'): number | null {
    const nums = text.replace(/[,$]/g, '').match(/\d+/g);
    if (!nums) return null;
    return type === 'min' ? parseInt(nums[0], 10) : (nums.length >= 2 ? parseInt(nums[1], 10) : null);
  }

  private parseRelDate(rel: string): string {
    if (!rel) return new Date().toISOString();
    const m = rel.match(/(\d+)\s*(hour|day|week|month)/i);
    if (!m) return new Date().toISOString();
    const v = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    const d = new Date();
    if (u.startsWith('hour')) d.setHours(d.getHours() - v);
    else if (u.startsWith('day')) d.setDate(d.getDate() - v);
    else if (u.startsWith('week')) d.setDate(d.getDate() - v * 7);
    else if (u.startsWith('month')) d.setMonth(d.getMonth() - v);
    return d.toISOString();
  }

  private hashStr(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  }
}
