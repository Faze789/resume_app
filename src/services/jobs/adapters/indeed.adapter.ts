import type { IJobAdapter, NormalizedJob } from './types';

const httpFetch = globalThis.fetch;

/**
 * Indeed adapter — multi-strategy approach to fetch country-specific jobs.
 *
 * Strategy chain (tries each in order):
 *   1. RSS feed   — designed for programmatic consumption, lightest anti-bot
 *   2. Desktop page → parse mosaic JSON / JSON-LD / HTML regex
 *   3. Mobile page → simpler HTML structure
 *
 * Supports 40+ country domains (pk.indeed.com, in.indeed.com, etc.).
 */
export class IndeedAdapter implements IJobAdapter {
  platformName = 'indeed';
  requiresApiKey = false;

  private static COUNTRY_DOMAINS: Record<string, string> = {
    pakistan: 'pk', india: 'in', uk: 'uk', 'united kingdom': 'uk', britain: 'uk',
    canada: 'ca', australia: 'au', germany: 'de', france: 'fr', italy: 'it',
    netherlands: 'nl', spain: 'es', brazil: 'br', mexico: 'mx', japan: 'jp',
    singapore: 'sg', 'south africa': 'za', nigeria: 'ng', kenya: 'ke',
    egypt: 'eg', 'saudi arabia': 'sa', uae: 'ae', 'united arab emirates': 'ae',
    qatar: 'qa', malaysia: 'my', philippines: 'ph', indonesia: 'id',
    thailand: 'th', vietnam: 'vn', poland: 'pl', turkey: 'tr',
    ireland: 'ie', sweden: 'se', norway: 'no', denmark: 'dk', finland: 'fi',
    switzerland: 'ch', austria: 'at', belgium: 'be', portugal: 'pt',
    argentina: 'ar', chile: 'cl', colombia: 'co', peru: 'pe',
    'new zealand': 'nz', china: 'cn', 'south korea': 'kr', taiwan: 'tw',
    'hong kong': 'hk', romania: 'ro', czech: 'cz', hungary: 'hu', greece: 'gr',
    usa: 'www', 'united states': 'www', us: 'www',
  };

  private static HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
  };

  private getDomain(location?: string): string {
    if (!location) return 'www';
    const lower = location.toLowerCase();
    for (const [country, domain] of Object.entries(IndeedAdapter.COUNTRY_DOMAINS)) {
      if (lower.includes(country)) return domain;
    }
    return 'www';
  }

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    const domain = this.getDomain(location);
    const baseHost = `${domain}.indeed.com`;

    // Strategy 1: RSS feed (most reliable — designed for programmatic consumption)
    const rssJobs = await this.tryRSS(baseHost, domain, query, location);
    if (rssJobs.length > 0) return rssJobs;

    // Strategy 2: Desktop HTML page
    const desktopJobs = await this.tryDesktopPage(baseHost, domain, query, location);
    if (desktopJobs.length > 0) return desktopJobs;

    // Strategy 3: Mobile page
    const mobileJobs = await this.tryMobilePage(baseHost, domain, query, location);
    if (mobileJobs.length > 0) return mobileJobs;

    console.warn(`Indeed: 0 jobs from ${baseHost} for "${query}"`);
    return [];
  }

  // ── Strategy 1: RSS Feed ──

  private async tryRSS(host: string, domain: string, query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ q: query, sort: 'date', fromage: '60' });
    if (location) params.set('l', location);

    const url = `https://${host}/rss?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: {
          ...IndeedAdapter.HEADERS,
          'Accept': 'application/rss+xml,application/xml,text/xml,*/*;q=0.1',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        console.warn(`Indeed RSS ${response.status} from ${host}`);
        return [];
      }

      const xml = await response.text();

      // Verify it's actual XML/RSS, not a challenge page
      if (!xml.includes('<rss') && !xml.includes('<channel') && !xml.includes('<item')) {
        console.warn('Indeed RSS: response is not XML');
        return [];
      }

      return this.parseRSSItems(xml, domain);
    } catch (err: any) {
      console.warn(`Indeed RSS error (${host}):`, err.message);
      return [];
    }
  }

  private parseRSSItems(xml: string, domain: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];

    // Split by <item> tags
    const items = xml.split(/<item\b[^>]*>/i).slice(1); // skip everything before first <item>

    for (const item of items.slice(0, 25)) {
      try {
        const title = this.extractXmlTag(item, 'title');
        const link = this.extractXmlTag(item, 'link');
        const description = this.extractXmlCdata(item, 'description') || this.extractXmlTag(item, 'description');
        const pubDate = this.extractXmlTag(item, 'pubDate');
        const source = this.extractXmlTag(item, 'source');

        if (!title) continue;

        // Indeed RSS titles are often "Job Title - Company Name"
        const titleParts = title.split(/\s+[-–—]\s+/);
        const jobTitle = titleParts[0]?.trim() || title;
        const companyFromTitle = titleParts.length > 1 ? titleParts[titleParts.length - 1]?.trim() : '';

        // Extract company from <source> tag if not in title
        const company = companyFromTitle || source || 'Unknown';

        // Extract location from description HTML
        const locationFromDesc = this.extractLocationFromDescription(description || '');

        // Extract jobkey from link URL
        const jkMatch = link?.match(/jk=([a-f0-9]+)/i);
        const jobKey = jkMatch?.[1] || `ind-rss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Clean description
        const cleanDesc = this.stripHtml(description || '').slice(0, 2000);

        jobs.push({
          title: jobTitle,
          company_name: company,
          company_logo_url: null,
          description: cleanDesc,
          requirements: [],
          skills_required: this.extractSkills(cleanDesc, jobTitle),
          location: locationFromDesc,
          is_remote: this.checkRemote(locationFromDesc, jobTitle, false),
          salary_min: this.extractSalaryFromText(cleanDesc, 'min'),
          salary_max: this.extractSalaryFromText(cleanDesc, 'max'),
          salary_currency: this.guessCurrency(domain),
          job_type: this.guessJobType(jobTitle),
          experience_level: this.guessLevel(jobTitle),
          source_platform: 'indeed',
          source_url: link || `https://${domain}.indeed.com/viewjob?jk=${jobKey}`,
          external_id: jobKey,
          posted_at: pubDate ? this.parseRSSDate(pubDate) : new Date().toISOString(),
          metadata: { source: 'indeed_rss', domain },
        });
      } catch {
        // Skip malformed item
      }
    }

    if (jobs.length > 0) {
      console.log(`Indeed RSS: parsed ${jobs.length} jobs from ${domain}`);
    }
    return jobs;
  }

  private extractXmlTag(xml: string, tag: string): string | null {
    // Handle both <tag>content</tag> and <tag><![CDATA[content]]></tag>
    const regex = new RegExp(`<${tag}[^>]*>(?:\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*|([\\s\\S]*?))<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return null;
    const content = (match[1] || match[2] || '').trim();
    return content || null;
  }

  private extractXmlCdata(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match?.[1]?.trim() || null;
  }

  private extractLocationFromDescription(desc: string): string | null {
    // Indeed RSS descriptions sometimes start with location in a <span> or as plain text
    // Common patterns: "Karachi, Pakistan - ", "Lahore, Sindh, Pakistan - "
    const locMatch = desc.match(/^[\s]*(?:<[^>]+>)*\s*([A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+){0,2})\s*[-–—]/);
    if (locMatch) return locMatch[1].trim();

    // Try finding location in bold or specific HTML
    const boldLoc = desc.match(/<b>\s*Location:\s*<\/b>\s*([^<]+)/i);
    if (boldLoc) return boldLoc[1].trim();

    return null;
  }

  private parseRSSDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch { /* fallthrough */ }
    return new Date().toISOString();
  }

  private extractSalaryFromText(text: string, type: 'min' | 'max'): number | null {
    // Look for salary patterns like "$50,000 - $80,000" or "PKR 100,000 - 200,000"
    const salaryMatch = text.match(/(?:[\$£€₹]|PKR|INR|USD|GBP|EUR)\s*([\d,]+(?:\.\d+)?)\s*[-–—to]+\s*(?:[\$£€₹]|PKR|INR|USD|GBP|EUR)?\s*([\d,]+(?:\.\d+)?)/i);
    if (salaryMatch) {
      const nums = [
        parseInt(salaryMatch[1].replace(/,/g, ''), 10),
        parseInt(salaryMatch[2].replace(/,/g, ''), 10),
      ];
      return type === 'min' ? nums[0] : nums[1];
    }

    // Single salary mention
    const singleMatch = text.match(/(?:[\$£€₹]|PKR|INR|USD|GBP|EUR)\s*([\d,]+)/i);
    if (singleMatch && type === 'min') {
      return parseInt(singleMatch[1].replace(/,/g, ''), 10);
    }

    return null;
  }

  // ── Strategy 2: Desktop HTML Page ──

  private async tryDesktopPage(host: string, domain: string, query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ q: query, sort: 'date', limit: '25', fromage: '60' });
    if (location) params.set('l', location);
    const url = `https://${host}/jobs?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: IndeedAdapter.HEADERS,
        redirect: 'follow',
      });
      if (!response.ok) {
        console.warn(`Indeed desktop ${response.status} from ${host}`);
        return [];
      }

      const html = await response.text();

      // Check if we got a challenge page
      if (html.includes('captcha') || html.includes('unusual traffic') || html.length < 5000) {
        console.warn('Indeed desktop: got challenge/captcha page');
        return [];
      }

      // Strategy 2a: mosaic JSON blob
      let jobs = this.parseFromMosaicData(html, domain);
      if (jobs.length > 0) return jobs;

      // Strategy 2b: JSON-LD
      jobs = this.parseFromJsonLD(html, domain);
      if (jobs.length > 0) return jobs;

      // Strategy 2c: HTML regex
      jobs = this.parseFromHTML(html, domain);
      return jobs;
    } catch (err: any) {
      console.warn(`Indeed desktop error (${host}):`, err.message);
      return [];
    }
  }

  // ── Strategy 3: Mobile Page ──

  private async tryMobilePage(host: string, domain: string, query: string, location?: string): Promise<NormalizedJob[]> {
    const params = new URLSearchParams({ q: query, sort: 'date', fromage: '60' });
    if (location) params.set('l', location);
    const url = `https://${host}/m/jobs?${params.toString()}`;

    try {
      const response = await httpFetch(url, {
        headers: IndeedAdapter.HEADERS,
        redirect: 'follow',
      });
      if (!response.ok) return [];

      const html = await response.text();
      if (html.includes('captcha') || html.length < 3000) return [];

      return this.parseMobilePage(html, domain);
    } catch (err: any) {
      console.warn(`Indeed mobile error (${host}):`, err.message);
      return [];
    }
  }

  // ── HTML Parsing Strategies ──

  private parseFromMosaicData(html: string, domain: string): NormalizedJob[] {
    try {
      const mosaicMatch = html.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
      if (!mosaicMatch) return [];

      const data = JSON.parse(mosaicMatch[1]);
      const results = data?.metaData?.mosaicProviderJobCardsModel?.results || [];

      return results.filter((j: any) => j.title && j.company).map((job: any): NormalizedJob => ({
        title: job.title || job.displayTitle || '',
        company_name: job.company || '',
        company_logo_url: job.companyBrandingAttributes?.logoUrl || null,
        description: this.stripHtml(job.snippet || ''),
        requirements: [],
        skills_required: this.extractSkills(job.snippet || '', job.title || ''),
        location: job.formattedLocation || job.jobLocationCity || null,
        is_remote: this.checkRemote(job.formattedLocation, job.title, job.remoteLocation),
        salary_min: this.extractSalaryNum(job.extractedSalary || job.salarySnippet, 'min'),
        salary_max: this.extractSalaryNum(job.extractedSalary || job.salarySnippet, 'max'),
        salary_currency: this.guessCurrency(domain),
        job_type: this.mapJobType(job.jobTypes),
        experience_level: this.guessLevel(job.title || ''),
        source_platform: 'indeed',
        source_url: `https://${domain}.indeed.com/viewjob?jk=${job.jobkey}`,
        external_id: job.jobkey || `ind-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        posted_at: this.parseRelDate(job.formattedRelativeTime || ''),
        metadata: { source: 'indeed_mosaic', domain },
      }));
    } catch {
      return [];
    }
  }

  private parseFromJsonLD(html: string, domain: string): NormalizedJob[] {
    try {
      const items: any[] = [];
      const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed['@type'] === 'JobPosting') items.push(parsed);
          if (Array.isArray(parsed)) items.push(...parsed.filter((p: any) => p['@type'] === 'JobPosting'));
          if (parsed['@type'] === 'ItemList' && parsed.itemListElement) {
            for (const el of parsed.itemListElement) {
              const job = el.item || el;
              if (job['@type'] === 'JobPosting') items.push(job);
            }
          }
        } catch { /* skip */ }
      }

      return items.filter(j => j.title || j.name).map((job: any): NormalizedJob => ({
        title: job.title || job.name || '',
        company_name: job.hiringOrganization?.name || '',
        company_logo_url: job.hiringOrganization?.logo || null,
        description: this.stripHtml(job.description || '').slice(0, 3000),
        requirements: [],
        skills_required: this.extractSkills(job.description || '', job.title || ''),
        location: this.fmtJsonLdLoc(job.jobLocation),
        is_remote: job.jobLocationType === 'TELECOMMUTE',
        salary_min: job.baseSalary?.value?.minValue ? Number(job.baseSalary.value.minValue) : null,
        salary_max: job.baseSalary?.value?.maxValue ? Number(job.baseSalary.value.maxValue) : null,
        salary_currency: job.baseSalary?.currency || this.guessCurrency(domain),
        job_type: this.mapEmploymentType(job.employmentType),
        experience_level: this.guessLevel(job.title || ''),
        source_platform: 'indeed',
        source_url: job.url || null,
        external_id: job.identifier?.value || `ind-ld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        posted_at: job.datePosted || new Date().toISOString(),
        metadata: { source: 'indeed_jsonld', domain },
      }));
    } catch {
      return [];
    }
  }

  private parseFromHTML(html: string, domain: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];
    const cardRegex = /data-jk="([^"]+)"[\s\S]*?<(?:h2|a)[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<(?:span|a)[^>]*>([^<]+)<\/(?:span|a)>[\s\S]*?data-testid="company-name"[^>]*>([^<]+)<[\s\S]*?data-testid="text-location"[^>]*>([^<]+)</g;
    let match;
    while ((match = cardRegex.exec(html)) !== null && jobs.length < 25) {
      const [, jk, title, company, loc] = match;
      if (!title?.trim() || !company?.trim()) continue;
      jobs.push(this.buildJob(domain, jk, title, company, loc));
    }
    return jobs;
  }

  private parseMobilePage(html: string, domain: string): NormalizedJob[] {
    const jobs: NormalizedJob[] = [];
    const regex = /href="\/m\/viewjob\?jk=([^"&]+)"[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]+)<[\s\S]*?class="[^"]*company[^"]*"[^>]*>([^<]+)<[\s\S]*?class="[^"]*location[^"]*"[^>]*>([^<]+)</g;
    let match;
    while ((match = regex.exec(html)) !== null && jobs.length < 25) {
      const [, jk, title, company, loc] = match;
      if (!title?.trim()) continue;
      jobs.push(this.buildJob(domain, jk, title, company, loc));
    }
    return jobs;
  }

  // ── Helpers ──

  private buildJob(domain: string, jk: string, rawTitle: string, rawCompany: string, rawLoc: string | null): NormalizedJob {
    const title = this.stripHtml(rawTitle).trim();
    const company = this.stripHtml(rawCompany || '').trim();
    const loc = rawLoc ? this.stripHtml(rawLoc).trim() : null;
    return {
      title,
      company_name: company || 'Unknown',
      company_logo_url: null,
      description: '',
      requirements: [],
      skills_required: this.extractSkills('', title),
      location: loc,
      is_remote: this.checkRemote(loc, title, false),
      salary_min: null,
      salary_max: null,
      salary_currency: this.guessCurrency(domain),
      job_type: 'full_time',
      experience_level: this.guessLevel(title),
      source_platform: 'indeed',
      source_url: `https://${domain}.indeed.com/viewjob?jk=${jk}`,
      external_id: jk,
      posted_at: new Date().toISOString(),
      metadata: { source: 'indeed_html', domain },
    };
  }

  private stripHtml(t: string): string {
    return t.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private checkRemote(loc: any, title: any, flag: any): boolean {
    if (flag === true) return true;
    const t = `${loc || ''} ${title || ''}`.toLowerCase();
    return t.includes('remote') || t.includes('work from home') || t.includes('wfh');
  }

  private guessCurrency(domain: string): string {
    const m: Record<string, string> = {
      pk: 'PKR', in: 'INR', uk: 'GBP', ca: 'CAD', au: 'AUD',
      de: 'EUR', fr: 'EUR', it: 'EUR', nl: 'EUR', es: 'EUR', be: 'EUR',
      sg: 'SGD', za: 'ZAR', ae: 'AED', sa: 'SAR', jp: 'JPY',
      br: 'BRL', mx: 'MXN', www: 'USD',
    };
    return m[domain] || 'USD';
  }

  private guessJobType(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('part time') || lower.includes('part-time')) return 'part_time';
    if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
    return 'full_time';
  }

  private extractSalaryNum(obj: any, type: 'min' | 'max'): number | null {
    if (!obj) return null;
    if (type === 'min' && obj.min) return Number(obj.min) || null;
    if (type === 'max' && obj.max) return Number(obj.max) || null;
    if (obj.text) {
      const nums = obj.text.replace(/[,$]/g, '').match(/\d+/g);
      if (!nums) return null;
      return type === 'min' ? parseInt(nums[0], 10) : (nums.length >= 2 ? parseInt(nums[1], 10) : null);
    }
    return null;
  }

  private fmtJsonLdLoc(loc: any): string | null {
    if (!loc) return null;
    if (typeof loc === 'string') return loc;
    if (Array.isArray(loc)) return loc.map((l: any) => l.address?.addressLocality || l.name || '').filter(Boolean).join(', ') || null;
    const a = loc.address || loc;
    return [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(', ') || null;
  }

  private mapJobType(types: any): string {
    if (!types) return 'full_time';
    const s = (Array.isArray(types) ? types.join(' ') : String(types)).toLowerCase();
    if (s.includes('full')) return 'full_time';
    if (s.includes('part')) return 'part_time';
    if (s.includes('contract') || s.includes('temp')) return 'contract';
    if (s.includes('intern')) return 'internship';
    return 'full_time';
  }

  private mapEmploymentType(type: any): string {
    if (!type) return 'full_time';
    const s = (Array.isArray(type) ? type[0] : type).toString().toUpperCase();
    if (s.includes('FULL')) return 'full_time';
    if (s.includes('PART')) return 'part_time';
    if (s.includes('CONTRACT') || s.includes('TEMP')) return 'contract';
    if (s.includes('INTERN')) return 'internship';
    return 'full_time';
  }

  private guessLevel(title: string): string {
    const l = title.toLowerCase();
    if (l.includes('intern') || l.includes('junior') || l.includes('entry') || l.includes('jr.') || l.includes('graduate')) return 'entry';
    if (l.includes('senior') || l.includes('sr.') || l.includes('staff') || l.includes('principal')) return 'senior';
    if (l.includes('lead') || l.includes('director') || l.includes('head of') || l.includes('manager')) return 'lead';
    if (l.includes('vp') || l.includes('chief') || l.includes('cto')) return 'executive';
    return 'mid';
  }

  private extractSkills(desc: string, title: string): string[] {
    const text = `${desc} ${title}`.toLowerCase();
    const skills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Django', 'Flask', 'Spring', 'Express', 'Laravel',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
      'Git', 'CI/CD', 'REST', 'GraphQL', 'Machine Learning', 'AI', 'Terraform', 'Linux',
      'React Native', 'Flutter', 'iOS', 'Android', 'DevOps', 'Figma', 'HTML', 'CSS',
      'PHP', 'Ruby', '.NET', 'Scala', 'Power BI',
    ];
    return skills.filter((s) => text.includes(s.toLowerCase()));
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
}
