import { extractTextFromFile, readFileAsBytes } from './textExtractor';
import { parseResumeText, parseResumeWithGeminiFile } from '../ai/resumeParser.ai';
import { settingsStorage } from '../storage/settings.storage';
import type { ParsedResumeData } from '../../types/models';

export type ParseProgress = (status: string) => void;

export const ResumeParseService = {
  async parseFile(
    fileUri: string,
    mimeType: string,
    groqApiKey: string,
    onProgress?: ParseProgress
  ): Promise<ParsedResumeData> {
    // Load settings to get Gemini API key
    const settings = await settingsStorage.get();
    const geminiKey = settings.gemini_api_key;

    // ===========================================================
    // Strategy 1 (PRIMARY): Send raw file to Gemini
    // Gemini natively reads PDFs, images, DOCX — no text extraction needed
    // ===========================================================
    if (geminiKey) {
      onProgress?.('Reading file...');
      try {
        const { base64 } = await readFileAsBytes(fileUri);
        onProgress?.('Sending to Gemini AI for parsing...');

        const parsed = await parseResumeWithGeminiFile(geminiKey, base64, mimeType);

        const name = parsed.profile?.full_name || 'unknown';
        const skillCount = parsed.profile?.skills?.length || 0;
        onProgress?.(`Extracted profile for "${name}" with ${skillCount} skills`);
        return parsed;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Gemini parsing failed, falling back to Groq:', msg);
        onProgress?.('Gemini failed — trying alternate method...');
        // Fall through to Groq-based extraction
      }
    }

    // ===========================================================
    // Strategy 2 (FALLBACK): Extract text from file → send to Groq
    // ===========================================================
    onProgress?.('Extracting text from file...');
    let text = '';
    let method = '';

    try {
      const result = await extractTextFromFile(fileUri, mimeType);
      text = result.text;
      method = result.method;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Could not read the file: ${msg}`);
    }

    if (text.length < 20) {
      throw new Error(
        `Only ${text.length} characters extracted. ` +
        'The file may be image-based or encrypted. ' +
        'Please try a text-based PDF or DOCX file.'
      );
    }

    onProgress?.(`Extracted ${text.length} characters (${method})`);
    onProgress?.('Sending to AI for parsing...');

    let parsed: ParsedResumeData;
    try {
      parsed = await parseResumeText(groqApiKey, text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`AI parsing failed: ${msg}`);
    }

    const skillCount = parsed.profile?.skills?.length || 0;
    const name = parsed.profile?.full_name || 'unknown';
    onProgress?.(`Extracted profile for "${name}" with ${skillCount} skills`);

    return {
      ...parsed,
      raw_text: text,
    };
  },
};
