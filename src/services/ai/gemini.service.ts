import { GEMINI_API_URL } from '../../config/constants';

// Try multiple models — different models have separate rate limits
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite-001'] as const;

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

/**
 * Call Gemini API with text and/or inline file data.
 * Supports sending PDFs, images, and DOCX as base64 inline data.
 */
export async function callGemini(
  apiKey: string,
  contents: GeminiContent[],
  options: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const {
    model = GEMINI_MODELS[0],
    temperature = 0.1,
    maxOutputTokens = 8192,
    timeoutMs = 60000,
    jsonMode = false,
  } = options;

  const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  if (jsonMode) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'no details');
      if (response.status === 429) {
        throw new Error('Gemini rate limit exceeded. Please wait and try again.');
      }
      if (response.status === 400) {
        throw new Error(`Gemini API error: ${errText.slice(0, 300)}`);
      }
      if (response.status === 403) {
        throw new Error('Gemini API key is invalid or lacks permissions. Check your API key.');
      }
      throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API.');
    }
    return text;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini API request timed out. Please try again.');
    }
    throw err;
  }
}

/**
 * Parse a resume file using Gemini by sending the file as inline base64 data.
 * Gemini can natively process PDFs, images, and other document formats.
 */
export async function parseResumeWithGemini(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  promptText: string
): Promise<string> {
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ],
    },
  ];

  // Try each Gemini model — fall back if rate limited or errored
  let lastError = '';
  for (const model of GEMINI_MODELS) {
    try {
      return await callGemini(apiKey, contents, {
        model,
        temperature: 0.1,
        maxOutputTokens: 8192,
        timeoutMs: 60000,
        jsonMode: true,
      });
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`Gemini ${model} failed:`, lastError);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}
