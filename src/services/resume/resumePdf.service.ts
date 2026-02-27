import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Resume, ResumeContent, ResumeStyleConfig, ResumeSection } from '../../types/models';

const MARGIN_MAP: Record<string, string> = {
  narrow: '0.5in',
  normal: '0.75in',
  wide: '1in',
};

const LINE_HEIGHT_MAP: Record<string, string> = {
  compact: '1.3',
  comfortable: '1.5',
  spacious: '1.7',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPersonalInfo(info: ResumeContent['personal_info'], color: string): string {
  const contactParts: string[] = [];
  if (info.email) contactParts.push(info.email);
  if (info.phone) contactParts.push(info.phone);
  if (info.location) contactParts.push(info.location);
  if (info.linkedin) contactParts.push(info.linkedin);
  if (info.github) contactParts.push(info.github);
  if (info.portfolio) contactParts.push(info.portfolio);

  return `
    <div class="header">
      <h1 style="color: ${color}">${escapeHtml(info.full_name)}</h1>
      <p class="contact">${contactParts.map(escapeHtml).join(' | ')}</p>
    </div>
  `;
}

function renderSection(section: ResumeSection, color: string): string {
  const items = section.items.map((item: any) => {
    if (section.type === 'skills') {
      return `<p><strong>${escapeHtml(item.category || '')}:</strong> ${(item.skills || []).map(escapeHtml).join(', ')}</p>`;
    }

    const header = item.title ? `<strong>${escapeHtml(item.title)}</strong>` : '';
    const org = item.organization ? ` - ${escapeHtml(item.organization)}` : '';
    const dates = item.start_date
      ? `<span class="dates">${escapeHtml(item.start_date)}${item.end_date ? ` - ${escapeHtml(item.end_date)}` : item.is_current ? ' - Present' : ''}</span>`
      : '';
    const location = item.location ? `<span class="location">${escapeHtml(item.location)}</span>` : '';
    const desc = item.description ? `<p class="desc">${escapeHtml(item.description)}</p>` : '';
    const bullets = (item.bullets || [])
      .map((b: string) => `<li>${escapeHtml(b)}</li>`)
      .join('');
    const url = item.url ? `<p class="url">${escapeHtml(item.url)}</p>` : '';

    return `
      <div class="item">
        <div class="item-header">
          <span>${header}${org}</span>
          ${dates}
        </div>
        ${location ? `<div class="item-sub">${location}</div>` : ''}
        ${desc}
        ${url}
        ${bullets ? `<ul>${bullets}</ul>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <h2 style="color: ${color}; border-bottom: 2px solid ${color}">${escapeHtml(section.title)}</h2>
      ${items}
    </div>
  `;
}

function buildResumeHTML(resume: Resume): string {
  const { content, style_config } = resume;
  const margin = MARGIN_MAP[style_config.margin] || '0.75in';
  const lineHeight = LINE_HEIGHT_MAP[style_config.spacing] || '1.5';
  const color = style_config.color_primary;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: ${margin}; }
    body {
      font-family: ${style_config.font_family}, Arial, Helvetica, sans-serif;
      font-size: ${style_config.font_size}pt;
      color: #1e293b;
      line-height: ${lineHeight};
      margin: 0;
      padding: 0;
    }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 22pt; margin: 0 0 4px 0; }
    .contact { color: #475569; font-size: 9pt; margin: 0; }
    .summary { margin-bottom: 12px; color: #334155; font-size: 10pt; }
    .section { margin-bottom: 14px; }
    .section h2 {
      font-size: 12pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 8px 0;
      padding-bottom: 4px;
    }
    .item { margin-bottom: 10px; }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-header strong { font-size: 10.5pt; }
    .dates { color: #64748b; font-size: 9pt; }
    .item-sub { color: #64748b; font-size: 9pt; margin-bottom: 2px; }
    .location { color: #64748b; font-size: 9pt; }
    .desc { margin: 2px 0; font-size: 10pt; }
    .url { color: #64748b; font-size: 8.5pt; margin: 2px 0; }
    ul { margin: 4px 0; padding-left: 18px; }
    li { margin-bottom: 2px; font-size: 10pt; }
    p { margin: 2px 0; }
  </style>
</head>
<body>
  ${renderPersonalInfo(content.personal_info, color)}
  ${content.summary ? `<div class="summary">${escapeHtml(content.summary)}</div>` : ''}
  ${content.sections.map((s) => renderSection(s, color)).join('')}
</body>
</html>`;
}

export const ResumePdfService = {
  async generatePDF(resume: Resume): Promise<string> {
    const html = buildResumeHTML(resume);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  async sharePDF(uri: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
      });
    }
  },
};
