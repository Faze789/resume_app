import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { inflate } from 'pako';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Convert bytes to a latin1 string without TextDecoder (Hermes doesn't support latin1)
 */
function bytesToLatin1(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    chunks.push(String.fromCharCode(...slice));
  }
  return chunks.join('');
}

/**
 * Find all stream data sections in a PDF and decompress FlateDecode streams.
 * Returns an array of decompressed content stream strings.
 */
function decompressPDFStreams(bytes: Uint8Array): string[] {
  const raw = bytesToLatin1(bytes);
  const decompressed: string[] = [];

  // Find all stream...endstream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = streamRegex.exec(raw)) !== null) {
    const streamData = match[1];

    // Check if this stream's object uses FlateDecode by looking backwards
    const objStart = raw.lastIndexOf('obj', match.index);
    const objHeader = raw.substring(Math.max(0, objStart - 200), match.index);
    const isFlateDecode = objHeader.includes('/FlateDecode');

    if (isFlateDecode) {
      try {
        // Convert the latin1 stream data back to bytes for decompression
        const streamBytes = new Uint8Array(streamData.length);
        for (let i = 0; i < streamData.length; i++) {
          streamBytes[i] = streamData.charCodeAt(i);
        }
        const inflated = inflate(streamBytes);
        const text = bytesToLatin1(inflated);
        if (text.length > 0) {
          decompressed.push(text);
        }
      } catch {
        // Not all FlateDecode streams contain text (images, etc.) — skip silently
      }
    } else {
      // Uncompressed stream — use directly
      if (streamData.length > 10 && /[BT|Tj|TJ]/.test(streamData)) {
        decompressed.push(streamData);
      }
    }
  }

  return decompressed;
}

/**
 * Extract text operators (Tj, TJ) from a PDF content stream string.
 */
function extractTextFromContentStream(content: string): string[] {
  const parts: string[] = [];

  // Extract from BT...ET blocks
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let btMatch;
  while ((btMatch = btEtRegex.exec(content)) !== null) {
    const block = btMatch[1];
    extractTjFromBlock(block, parts);
  }

  // If BT/ET didn't find much, try standalone operators
  if (parts.length < 3) {
    extractTjFromBlock(content, parts);
  }

  return parts;
}

/**
 * Extract Tj and TJ text operators from a block of PDF content.
 */
function extractTjFromBlock(block: string, parts: string[]): void {
  // Tj — single string show: (text) Tj
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(block)) !== null) {
    const decoded = unescapePdfString(match[1]);
    if (decoded.trim()) parts.push(decoded);
  }

  // TJ — array with kerning: [(text) -100 (more)] TJ
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(block)) !== null) {
    const inner = match[1];
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;
    let line = '';
    while ((strMatch = stringRegex.exec(inner)) !== null) {
      line += unescapePdfString(strMatch[1]);
    }
    if (line.trim()) parts.push(line);
  }
}

/**
 * Unescape PDF string escape sequences.
 */
function unescapePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');
}

/**
 * Primary PDF text extraction — decompresses FlateDecode streams, then extracts text operators.
 * This handles the vast majority of modern PDFs that use compressed content streams.
 */
function extractTextFromPDFWithDecompression(bytes: Uint8Array): string {
  const streams = decompressPDFStreams(bytes);
  const allParts: string[] = [];

  for (const stream of streams) {
    const parts = extractTextFromContentStream(stream);
    allParts.push(...parts);
  }

  if (allParts.length === 0) return '';

  return allParts.join('\n').trim();
}

/**
 * Regex-based PDF text extraction for uncompressed PDFs.
 * Works directly on raw bytes without decompression.
 */
function extractTextFromPDFBytesRegex(bytes: Uint8Array): string {
  const text = bytesToLatin1(bytes);
  const parts: string[] = [];
  extractTjFromBlock(text, parts);

  if (parts.length >= 3) {
    return parts.join('\n').trim();
  }

  // Last resort — extract readable ASCII strings
  const asciiParts = text.match(/[\x20-\x7E]{6,}/g) || [];
  const filtered = asciiParts.filter((p) =>
    !p.match(/^(obj|endobj|stream|endstream|xref|trailer|startxref|BT|ET|Tf|Td|Tm|cm|q|Q|re|f|W|n|\/[A-Z])/) &&
    p.length > 8 &&
    /[a-zA-Z]{2,}/.test(p)
  );
  if (filtered.length > parts.length) {
    return filtered.join('\n').replace(/\s+/g, ' ').trim();
  }

  return parts.join('\n').trim();
}

/**
 * Extract text from a PDF using pdfjs-dist (handles fonts, encoding, layout)
 */
async function extractTextFromPDFWithPdfJs(bytes: Uint8Array): Promise<string> {
  let pdfjsLib: any;
  try {
    pdfjsLib = require('pdfjs-dist');
    if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  } catch {
    throw new Error('pdfjs-dist not available');
  }

  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(0),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf: any = await withTimeout(loadingTask.promise, 15000, 'PDF loading');
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let currentLine = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as any;
        const y = textItem.transform?.[5];

        if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        }

        currentLine += textItem.str;
        if (textItem.hasEOL) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        }

        if (y !== undefined) lastY = y;
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim());
    if (pageNum < pdf.numPages) lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractTextFromDOCX(bytes: Uint8Array): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return '';

    const withBreaks = docXml.replace(/<\/w:p>/g, '\n');
    const cleanRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const lines: string[] = [];

    for (const part of withBreaks.split('\n')) {
      let lineText = '';
      let match;
      while ((match = cleanRegex.exec(part)) !== null) {
        lineText += match[1];
      }
      if (lineText.trim()) lines.push(lineText.trim());
    }

    if (lines.length > 0) return lines.join('\n');

    // Fallback: extract all <w:t> tags
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(docXml)) !== null) {
      textParts.push(match[1]);
    }
    return textParts.join(' ');
  } catch {
    return '';
  }
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleaned = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor(cleaned.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(byteLength);
  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    const a = chars.indexOf(cleaned[i]);
    const b = chars.indexOf(cleaned[i + 1]);
    const c = chars.indexOf(cleaned[i + 2]);
    const d = chars.indexOf(cleaned[i + 3]);
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    if (p < byteLength) bytes[p++] = (bits >> 16) & 0xff;
    if (p < byteLength) bytes[p++] = (bits >> 8) & 0xff;
    if (p < byteLength) bytes[p++] = bits & 0xff;
  }
  return bytes;
}

function safeDecodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return bytesToLatin1(bytes);
  }
}

/**
 * Read a file from its URI and return raw bytes + base64 string.
 */
export async function readFileAsBytes(
  fileUri: string
): Promise<{ bytes: Uint8Array; base64: string }> {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });
    return { bytes: base64ToBytes(base64), base64 };
  } catch {
    // On web, FileSystem might not work — try fetch as fallback
    try {
      const response = await fetch(fileUri);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Convert to base64 manually
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = typeof btoa === 'function'
        ? btoa(binary)
        : Buffer.from(binary, 'binary').toString('base64');
      return { bytes, base64 };
    } catch {
      throw new Error('Could not read the file. Please try again.');
    }
  }
}

export async function extractTextFromFile(
  fileUri: string,
  mimeType: string
): Promise<{ text: string; method: string }> {
  try {
    const { bytes } = await readFileAsBytes(fileUri);

    if (bytes.length === 0) {
      throw new Error('File appears to be empty (0 bytes).');
    }

    // PDF extraction — try multiple methods with decompression first
    if (mimeType.includes('pdf')) {
      const methods: { name: string; fn: () => Promise<string> | string }[] = [
        {
          name: 'pdf_decompress',
          fn: () => extractTextFromPDFWithDecompression(bytes),
        },
        {
          name: 'pdfjs',
          fn: () => extractTextFromPDFWithPdfJs(bytes),
        },
        {
          name: 'pdf_regex',
          fn: () => extractTextFromPDFBytesRegex(bytes),
        },
        {
          name: 'utf8_fallback',
          fn: () => {
            const decoded = safeDecodeUtf8(bytes);
            const readable = (decoded.match(/[\x20-\x7E]{6,}/g) || [])
              .filter(s => /[a-zA-Z]{2,}/.test(s))
              .join('\n');
            return readable;
          },
        },
      ];

      for (const m of methods) {
        try {
          const text = await m.fn();
          if (text && text.length >= 20) {
            return { text, method: m.name };
          }
        } catch (err: any) {
          console.warn(`${m.name} extraction failed:`, err.message);
        }
      }
    }

    // DOCX extraction
    if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('document') || mimeType.includes('officedocument')) {
      const text = await extractTextFromDOCX(bytes);
      if (text.length >= 20) return { text, method: 'docx_parse' };
    }

    // Generic fallback: try to decode as UTF-8 text
    const fallbackText = safeDecodeUtf8(bytes);
    if (fallbackText.length >= 50 && /[a-zA-Z]{3,}/.test(fallbackText)) {
      return { text: fallbackText, method: 'raw_text' };
    }

    // Extract any readable ASCII
    const readable = (fallbackText.match(/[\x20-\x7E]{4,}/g) || []).join(' ');
    if (readable.length >= 20) return { text: readable, method: 'ascii_fallback' };

    throw new Error(
      `Could not extract readable text from this ${mimeType} file (${bytes.length} bytes). ` +
      'The file may be image-based or in an unsupported format. ' +
      'Please try uploading a text-based PDF or DOCX file, or take a photo of your resume.'
    );
  } catch (err: any) {
    if (err.message.includes('Could not extract') || err.message.includes('empty')) throw err;
    throw new Error(`Failed to read the file: ${err.message}. Please try a different file.`);
  }
}
