import { callGemini } from './gemini.service';
import { COVER_LETTER_PROMPT } from './prompts';
import type { UserProfile, JobListing } from '../../types/models';

/**
 * Generate a personalized cover letter using Gemini AI.
 * Combines user profile data with job listing details to create
 * a professional, targeted cover letter.
 */
export async function generateCoverLetter(
  apiKey: string,
  profile: UserProfile,
  job: JobListing,
): Promise<string> {
  const prompt = COVER_LETTER_PROMPT
    .replace('{name}', profile.full_name || 'Candidate')
    .replace('{headline}', profile.headline || 'Professional')
    .replace('{skills}', (profile.skills || []).join(', ') || 'Various technical skills')
    .replace('{experience_years}', String(profile.experience_years || 0))
    .replace('{bio}', profile.bio || 'Experienced professional seeking new opportunities')
    .replace('{job_title}', job.title)
    .replace('{company_name}', job.company_name)
    .replace('{job_description}', (job.description || '').slice(0, 2000))
    .replace('{required_skills}', (job.skills_required || []).join(', ') || 'Not specified');

  return await callGemini(apiKey, [
    { role: 'user', parts: [{ text: prompt }] },
  ], {
    temperature: 0.7,
    maxOutputTokens: 2048,
    timeoutMs: 30000,
  });
}
