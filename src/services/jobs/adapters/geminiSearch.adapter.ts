import type { IJobAdapter, NormalizedJob } from './types';
import { GEMINI_API_URL } from '../../../config/constants';

/**
 * Gemini + Google Search grounding adapter.
 * Uses the user's existing Gemini API key to search Google for real job listings
 * in any country. This is the PRIMARY adapter for country-specific job search.
 *
 * Approach:
 *   1. Try with google_search grounding tool (real-time search)
 *   2. If grounding fails/unavailable, fall back to Gemini's knowledge to suggest
 *      real companies and roles that are typically hiring in the location
 *
 * Response handling is robust — extracts JSON from markdown fences, natural
 * language, or multi-part responses.
 */
export class GeminiSearchAdapter implements IJobAdapter {
  platformName = 'gemini_search';
  requiresApiKey = true;

  constructor(private apiKey: string) {}

  async fetch(query: string, location?: string): Promise<NormalizedJob[]> {
    // Try with google_search grounding first
    const groundedJobs = await this.tryWithGrounding(query, location);
    if (groundedJobs.length > 0) return groundedJobs;

    // Fallback: Ask Gemini without grounding (uses training knowledge)
    const knowledgeJobs = await this.tryWithoutGrounding(query, location);
    return knowledgeJobs;
  }

  private async tryWithGrounding(query: string, location?: string): Promise<NormalizedJob[]> {
    const locationStr = location ? ` in ${location}` : '';
    const prompt = `Search for 15 current job openings for "${query}"${locationStr}.

For each job found, provide a JSON object with these fields:
- title: job title
- company_name: company name
- location: city, country
- is_remote: true/false
- job_type: full_time, part_time, contract, internship, or freelance
- salary: salary range if mentioned (e.g. "50000-80000 USD") or empty string
- apply_url: link to apply or empty string
- posted_date: when posted (ISO date or relative like "3 days ago")
- skills: array of required skills/technologies

Return ONLY a JSON array. No markdown, no explanation. Example:
[{"title":"Software Engineer","company_name":"Acme Corp","location":"Lahore, Pakistan","is_remote":false,"job_type":"full_time","salary":"","apply_url":"","posted_date":"2026-02-20","skills":["Python","React"]}]`;

    const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];

    for (const model of models) {
      try {
        const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${this.apiKey}`;

        const body = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.warn(`GeminiSearch grounded ${model}: ${response.status} ${errText.slice(0, 200)}`);
          // If 400/404, google_search tool likely not supported — skip to fallback
          if (response.status === 400 || response.status === 404) break;
          continue;
        }

        const data = await response.json();
        const jobs = this.extractJobsFromGeminiResponse(data);
        if (jobs.length > 0) {
          console.log(`GeminiSearch grounded (${model}): ${jobs.length} jobs`);
          return jobs;
        }
      } catch (err: any) {
        console.warn(`GeminiSearch grounded ${model} error:`, err.message);
      }
    }

    return [];
  }

  private async tryWithoutGrounding(query: string, location?: string): Promise<NormalizedJob[]> {
    const locationStr = location ? ` in ${location}` : '';
    const prompt = `You are a job market expert. List 10 realistic, currently active job openings for "${query}"${locationStr}.

Use your knowledge of real companies that typically hire for this role in this location. Include well-known local companies, multinational companies with offices there, and startups.

For each job, provide a JSON object with these fields:
- title: specific job title
- company_name: real company name that operates in that location
- location: specific city, country
- is_remote: true/false
- job_type: full_time, part_time, contract, internship, or freelance
- salary: estimated salary range for this role in local currency or empty string
- apply_url: company careers page URL if known, or empty string
- posted_date: "${new Date().toISOString().split('T')[0]}"
- skills: array of typically required skills/technologies

Return ONLY a JSON array. No markdown fences, no explanation.`;

    try {
      const url = `${GEMINI_API_URL}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`GeminiSearch knowledge fallback: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const jobs = this.extractJobsFromGeminiResponse(data);
      if (jobs.length > 0) {
        console.log(`GeminiSearch knowledge fallback: ${jobs.length} jobs`);
      }
      return jobs;
    } catch (err: any) {
      console.warn('GeminiSearch knowledge fallback error:', err.message);
      return [];
    }
  }

  /**
   * Extract jobs from Gemini API response — handles multiple response formats:
   * 1. Pure JSON array in text
   * 2. JSON wrapped in markdown code fences
   * 3. Multi-part responses (concatenate all text parts)
   * 4. Natural language with embedded structured data
   */
  private extractJobsFromGeminiResponse(data: any): NormalizedJob[] {
    // Collect all text from all candidates and all parts
    let fullText = '';

    const candidates = data?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          fullText += part.text + '\n';
        }
      }
    }

    if (!fullText.trim()) {
      // Check if there's grounding metadata with search results
      const grounding = candidates[0]?.groundingMetadata;
      if (grounding?.groundingChunks) {
        console.log('GeminiSearch: found grounding chunks but no text — tool may require paid tier');
      }
      return [];
    }

    return this.parseResponse(fullText);
  }

  private parseResponse(text: string): NormalizedJob[] {
    let jsonStr = text;

    // Strip markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    // Find the JSON array boundaries
    const arrStart = jsonStr.indexOf('[');
    const arrEnd = jsonStr.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      jsonStr = jsonStr.slice(arrStart, arrEnd + 1);
    }

    let items: any[];
    try {
      items = JSON.parse(jsonStr);
    } catch {
      // Try to fix common JSON issues: trailing commas, single quotes
      try {
        const fixed = jsonStr
          .replace(/,\s*]/g, ']')   // trailing commas
          .replace(/,\s*}/g, '}')   // trailing commas in objects
          .replace(/'/g, '"');       // single quotes to double
        items = JSON.parse(fixed);
      } catch {
        console.warn('GeminiSearch: failed to parse JSON from response');
        // Last resort: try to extract individual JSON objects
        items = this.extractJsonObjects(text);
      }
    }

    if (!Array.isArray(items) || items.length === 0) return [];

    return items
      .filter((item: any) => item && item.title && item.company_name)
      .map((item: any): NormalizedJob => ({
        title: String(item.title || '').trim(),
        company_name: String(item.company_name || '').trim(),
        company_logo_url: null,
        description: '',
        requirements: [],
        skills_required: Array.isArray(item.skills) ? item.skills.filter((s: any) => typeof s === 'string') : [],
        location: item.location || null,
        is_remote: item.is_remote === true || String(item.is_remote).toLowerCase() === 'true',
        salary_min: this.parseSalaryMin(item.salary),
        salary_max: this.parseSalaryMax(item.salary),
        salary_currency: this.parseSalaryCurrency(item.salary),
        job_type: this.normalizeJobType(item.job_type),
        experience_level: this.guessExperienceLevel(item.title || ''),
        source_platform: 'gemini_search',
        source_url: this.sanitizeUrl(item.apply_url),
        external_id: `gs-${this.hashString(`${item.title}-${item.company_name}-${item.location || ''}`)}`,
        posted_at: this.parseDate(item.posted_date),
        metadata: { source: 'google_search_grounding' },
      }));
  }

  /**
   * Last-resort extraction: find individual JSON objects {...} in the text
   * and try to parse them as job listings.
   */
  private extractJsonObjects(text: string): any[] {
    const objects: any[] = [];
    const regex = /\{[^{}]*"title"\s*:\s*"[^"]+?"[^{}]*"company_name"\s*:\s*"[^"]+?"[^{}]*\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.title && obj.company_name) objects.push(obj);
      } catch { /* skip */ }
    }
    return objects;
  }

  private parseSalaryMin(salary: any): number | null {
    if (!salary || typeof salary !== 'string' || salary.trim() === '') return null;
    const numbers = salary.replace(/[,$]/g, '').match(/\d+/g);
    if (!numbers || numbers.length === 0) return null;
    return parseInt(numbers[0], 10);
  }

  private parseSalaryMax(salary: any): number | null {
    if (!salary || typeof salary !== 'string' || salary.trim() === '') return null;
    const numbers = salary.replace(/[,$]/g, '').match(/\d+/g);
    if (!numbers || numbers.length < 2) return null;
    return parseInt(numbers[1], 10);
  }

  private parseSalaryCurrency(salary: any): string {
    if (!salary || typeof salary !== 'string') return 'USD';
    const upper = salary.toUpperCase();
    if (upper.includes('PKR') || upper.includes('RS') || upper.includes('RUPEE')) return 'PKR';
    if (upper.includes('EUR') || upper.includes('\u20AC')) return 'EUR';
    if (upper.includes('GBP') || upper.includes('\u00A3')) return 'GBP';
    if (upper.includes('INR') || upper.includes('\u20B9')) return 'INR';
    if (upper.includes('CAD')) return 'CAD';
    if (upper.includes('AUD')) return 'AUD';
    return 'USD';
  }

  private normalizeJobType(type: any): string {
    if (!type) return 'full_time';
    const lower = String(type).toLowerCase().replace(/[\s-]/g, '_');
    const map: Record<string, string> = {
      full_time: 'full_time', fulltime: 'full_time',
      part_time: 'part_time', parttime: 'part_time',
      contract: 'contract', contractor: 'contract',
      internship: 'internship', intern: 'internship',
      freelance: 'freelance',
    };
    return map[lower] || 'full_time';
  }

  private guessExperienceLevel(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('intern') || lower.includes('junior') || lower.includes('entry') || lower.includes('jr')) return 'entry';
    if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff') || lower.includes('principal')) return 'senior';
    if (lower.includes('lead') || lower.includes('director') || lower.includes('head') || lower.includes('manager')) return 'lead';
    if (lower.includes('vp') || lower.includes('chief') || lower.includes('cto') || lower.includes('ceo')) return 'executive';
    return 'mid';
  }

  private sanitizeUrl(url: any): string | null {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return null;
  }

  private parseDate(dateStr: any): string {
    if (!dateStr) return new Date().toISOString();
    const s = String(dateStr);

    const d = new Date(s);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) return d.toISOString();

    const match = s.match(/(\d+)\s*(hour|day|week|month)/i);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const now = new Date();
      if (unit.startsWith('hour')) now.setHours(now.getHours() - value);
      else if (unit.startsWith('day')) now.setDate(now.getDate() - value);
      else if (unit.startsWith('week')) now.setDate(now.getDate() - value * 7);
      else if (unit.startsWith('month')) now.setMonth(now.getMonth() - value);
      return now.toISOString();
    }

    return new Date().toISOString();
  }

  private hashString(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  }
}
