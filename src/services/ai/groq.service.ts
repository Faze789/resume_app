import { GROQ_API_URL, AI_MODELS } from '../../config/constants';
import { withRetry } from '../../utils/retry';

/** Text-only message */
type GroqTextMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** Multimodal content part (text or image) */
type GroqContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/** Multimodal message with content array */
type GroqMultimodalMessage = { role: 'user'; content: GroqContentPart[] };

export type GroqMessage = GroqTextMessage | GroqMultimodalMessage;

type GroqOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
  timeoutMs?: number;
};

export async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  const {
    model = AI_MODELS.POWERFUL,
    temperature = 0.1,
    max_tokens = 4096,
    json_mode = false,
    timeoutMs = 30000,
  } = options;

  return withRetry(async () => {
    const body: Record<string, any> = {
      model,
      messages,
      temperature,
      max_tokens,
    };

    if (json_mode) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'no details');
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 401) {
          throw new Error('Groq API authentication failed (401). Please check your API key in Settings.');
        }
        throw new Error(`Groq API error (${response.status}): ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq API. Please try again.');
      }
      return content;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Groq API request timed out. Please try again.');
      }
      throw err;
    }
  }, { maxAttempts: 2, delayMs: 3000 });
}
