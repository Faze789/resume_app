import { callGroq } from './groq.service';
import { RESUME_IMPROVE_PROMPT, GENERATE_SUMMARY_PROMPT } from './prompts';
import { AI_MODELS } from '../../config/constants';
import type { ResumeSection, UserProfile, ResumeExperienceItem } from '../../types/models';

export const ResumeImproverService = {
  async improveSection(apiKey: string, section: ResumeSection, jobContext?: string): Promise<ResumeSection> {
    const contextNote = jobContext ? `\n\nTarget job context: ${jobContext}` : '';
    const response = await callGroq(apiKey, [
      { role: 'system', content: RESUME_IMPROVE_PROMPT },
      { role: 'user', content: `Improve this ${section.type} section:\n\n${JSON.stringify(section, null, 2)}${contextNote}` },
    ], {
      model: AI_MODELS.POWERFUL,
      temperature: 0.3,
      max_tokens: 4096,
      json_mode: true,
    });

    try {
      const improved = JSON.parse(response);
      // Preserve original IDs and structure
      return {
        ...section,
        items: improved.items || section.items,
      };
    } catch {
      return section;
    }
  },

  async improveBullet(apiKey: string, bullet: string, context?: string): Promise<string> {
    const response = await callGroq(apiKey, [
      { role: 'system', content: 'You are an expert resume writer. Improve this resume bullet point. Make it concise, use a strong action verb, and include quantifiable impact if possible. Return only the improved bullet text, nothing else.' },
      { role: 'user', content: `Improve: "${bullet}"${context ? `\nContext: ${context}` : ''}` },
    ], {
      model: AI_MODELS.FAST,
      temperature: 0.3,
      max_tokens: 256,
    });

    return response.trim().replace(/^["']|["']$/g, '');
  },

  async generateSummary(
    apiKey: string,
    profile: Partial<UserProfile>,
    experience: ResumeExperienceItem[]
  ): Promise<string> {
    const context = [
      profile.headline ? `Title: ${profile.headline}` : '',
      profile.skills?.length ? `Skills: ${profile.skills.join(', ')}` : '',
      `Experience: ${profile.experience_years || 0} years`,
      experience.length ? `Recent roles: ${experience.slice(0, 3).map((e) => `${e.title} at ${e.organization}`).join('; ')}` : '',
    ].filter(Boolean).join('\n');

    const response = await callGroq(apiKey, [
      { role: 'system', content: GENERATE_SUMMARY_PROMPT },
      { role: 'user', content: context },
    ], {
      model: AI_MODELS.POWERFUL,
      temperature: 0.4,
      max_tokens: 512,
    });

    return response.trim();
  },
};
