import { callGroq } from './groq.service';
import { parseResumeWithGemini } from './gemini.service';
import { RESUME_PARSE_PROMPT } from './prompts';
import { AI_MODELS } from '../../config/constants';
import { normalizeSkill } from '../../utils/skillDictionary';
import type { ParsedResumeData } from '../../types/models';

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

function processAIResponse(raw: string, rawText: string): ParsedResumeData {
  const cleaned = cleanJsonResponse(raw);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI returned invalid JSON');
    }
  }

  const profile = parsed.profile || {};

  // Normalize extracted skills through our skill dictionary
  if (Array.isArray(profile.skills) && profile.skills.length > 0) {
    profile.skills = [...new Set(profile.skills.map((s: string) => normalizeSkill(s)))];
  }

  if (typeof profile.experience_years !== 'number' || isNaN(profile.experience_years)) {
    profile.experience_years = 0;
  }

  if (!profile.email && parsed.resume_content?.personal_info?.email) {
    profile.email = parsed.resume_content.personal_info.email;
  }

  return {
    profile,
    resume_content: parsed.resume_content || {
      personal_info: { full_name: profile.full_name || '', email: profile.email || '' },
      summary: profile.bio || '',
      sections: [],
    },
    raw_text: rawText,
    confidence: parsed.confidence || null,
  };
}

/**
 * Parse resume using Gemini — sends the raw file (PDF/image/DOCX) directly.
 * Gemini natively understands document formats, so no text extraction needed.
 */
export async function parseResumeWithGeminiFile(
  geminiApiKey: string,
  base64Data: string,
  mimeType: string
): Promise<ParsedResumeData> {
  const prompt = RESUME_PARSE_PROMPT + '\n\nParse this resume document and extract EVERY detail. Return ONLY valid JSON.';

  const response = await parseResumeWithGemini(geminiApiKey, base64Data, mimeType, prompt);
  return processAIResponse(response, '[parsed via Gemini]');
}

/**
 * Parse resume from extracted text using Groq text-based LLM.
 */
export async function parseResumeText(
  apiKey: string,
  rawText: string
): Promise<ParsedResumeData> {
  const text = rawText.slice(0, 20000);

  const models = [AI_MODELS.POWERFUL, AI_MODELS.FAST];
  let lastError: string = '';

  for (const model of models) {
    try {
      const response = await callGroq(apiKey, [
        { role: 'system', content: RESUME_PARSE_PROMPT },
        { role: 'user', content: `Parse this resume and extract EVERY detail. Return ONLY valid JSON, no markdown:\n\n${text}` },
      ], {
        model,
        temperature: 0.1,
        max_tokens: 6000,
        json_mode: true,
        timeoutMs: 45000,
      });

      return processAIResponse(response, rawText);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`Resume parse failed with model ${model}:`, lastError);
    }
  }

  throw new Error(
    `AI text parsing failed: ${lastError}. ` +
    'Please try again or skip to manual entry.'
  );
}
