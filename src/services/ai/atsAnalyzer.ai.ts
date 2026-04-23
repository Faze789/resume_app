import { callGroq } from './groq.service';
import { ATS_ANALYSIS_PROMPT } from './prompts';
import { AI_MODELS } from '../../config/constants';
import { findSkillMatches, normalizeSkill } from '../../utils/skillDictionary';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import type { Resume, ATSAnalysis, ATSSuggestion } from '../../types/models';

// ============================================================================
// Stage 1: Algorithmic Analysis (no AI required)
// ============================================================================

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s+#./]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Count frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);
}

function extractSkillsFromText(text: string): string[] {
  const COMMON_TECH = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
    'Ruby', 'PHP', 'Scala', 'R', 'SQL', 'HTML', 'CSS',
    'React', 'React Native', 'Angular', 'Vue', 'Next.js', 'Svelte',
    'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET', 'Laravel', 'NestJS',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Firebase', 'DynamoDB', 'Elasticsearch',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Jenkins',
    'Git', 'Linux', 'GraphQL', 'REST API', 'Machine Learning', 'TensorFlow', 'PyTorch',
    'Agile', 'Scrum', 'Jira', 'Figma',
  ];

  const lower = text.toLowerCase();
  return COMMON_TECH.filter((skill) => lower.includes(skill.toLowerCase()));
}

function countActionVerbs(text: string): number {
  const verbs = [
    'led', 'developed', 'implemented', 'designed', 'managed', 'created', 'built',
    'improved', 'increased', 'reduced', 'delivered', 'launched', 'optimized',
    'automated', 'streamlined', 'established', 'achieved', 'spearheaded', 'initiated',
    'coordinated', 'analyzed', 'resolved', 'mentored', 'collaborated',
  ];
  const lower = text.toLowerCase();
  return verbs.filter((v) => lower.includes(v)).length;
}

function countQuantifiedAchievements(text: string): number {
  const patterns = [
    /\d+%/g,
    /\$[\d,.]+/g,
    /\d+\+?\s*(users|customers|clients|projects|team|members|engineers)/gi,
    /reduced.*by\s*\d+/gi,
    /increased.*by\s*\d+/gi,
    /improved.*by\s*\d+/gi,
  ];
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function detectSections(text: string): Record<string, boolean> {
  const patterns: Record<string, RegExp[]> = {
    summary: [/summary/i, /objective/i, /profile/i, /about/i],
    experience: [/experience/i, /work history/i, /employment/i],
    education: [/education/i, /academic/i, /degree/i, /university/i],
    skills: [/skills/i, /technical skills/i, /competencies/i],
    projects: [/projects/i, /portfolio/i],
    certifications: [/certifications/i, /certificates/i, /licenses/i],
  };

  const result: Record<string, boolean> = {};
  for (const [section, regexes] of Object.entries(patterns)) {
    result[section] = regexes.some((r) => r.test(text));
  }
  return result;
}

function algorithmicAnalysis(
  resumeText: string,
  jobDescription: string,
  jobTitle: string
): {
  keyword_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  formatting_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  skill_gaps: string[];
  suggestions: ATSSuggestion[];
  detail: Record<string, any>;
} {
  const jobKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);
  const resumeLower = resumeText.toLowerCase();

  // Keyword matching
  const matched_keywords = jobKeywords.filter((k) => resumeLower.includes(k));
  const missing_keywords = jobKeywords.filter((k) => !resumeLower.includes(k)).slice(0, 15);
  const keywordRatio = jobKeywords.length > 0 ? matched_keywords.length / jobKeywords.length : 0.5;
  const keyword_score = Math.round(Math.min(100, keywordRatio * 120));

  // Skills matching
  const jobSkills = extractSkillsFromText(jobDescription);
  const resumeSkills = extractSkillsFromText(resumeText);
  const { matched, missing } = findSkillMatches(resumeSkills, jobSkills);
  const skillRatio = jobSkills.length > 0 ? matched.length / jobSkills.length : 0.5;
  const skills_score = Math.round(Math.min(100, skillRatio * 110));
  const skill_gaps = missing;

  // Experience analysis
  const actionVerbs = countActionVerbs(resumeText);
  const quantified = countQuantifiedAchievements(resumeText);
  const experience_score = Math.round(
    Math.min(100, (actionVerbs / 10) * 40 + (quantified / 5) * 40 + 20)
  );

  // Education
  const sections = detectSections(resumeText);
  const education_score = sections.education ? 80 : 40;

  // Formatting
  const wordCount = resumeText.split(/\s+/).length;
  const hasProperLength = wordCount >= 200 && wordCount <= 1200;
  const hasKeySections = sections.experience && sections.skills;
  const formatting_score = Math.round(
    (hasProperLength ? 40 : 20) +
    (hasKeySections ? 30 : 15) +
    (sections.summary ? 15 : 5) +
    (sections.education ? 15 : 5)
  );

  // Generate suggestions
  const suggestions: ATSSuggestion[] = [];

  if (missing_keywords.length > 5) {
    suggestions.push({
      category: 'keywords',
      priority: 'critical',
      message: `Add these missing keywords from the job description: ${missing_keywords.slice(0, 5).join(', ')}`,
      estimatedImpact: 'high',
      source: 'algorithmic',
    });
  }

  if (skill_gaps.length > 0) {
    suggestions.push({
      category: 'skills',
      priority: 'high',
      message: `Include these required skills if applicable: ${skill_gaps.slice(0, 5).join(', ')}`,
      estimatedImpact: 'high',
      source: 'algorithmic',
    });
  }

  if (actionVerbs < 5) {
    suggestions.push({
      category: 'experience',
      priority: 'medium',
      message: 'Use more action verbs (Led, Developed, Implemented, Increased) in your bullet points',
      estimatedImpact: 'medium',
      source: 'algorithmic',
    });
  }

  if (quantified < 3) {
    suggestions.push({
      category: 'experience',
      priority: 'high',
      message: 'Add quantifiable achievements (percentages, dollar amounts, team sizes) to demonstrate impact',
      estimatedImpact: 'high',
      source: 'algorithmic',
    });
  }

  if (!sections.summary) {
    suggestions.push({
      category: 'formatting',
      priority: 'medium',
      message: 'Add a professional summary section at the top of your resume',
      estimatedImpact: 'medium',
      source: 'algorithmic',
    });
  }

  if (wordCount < 200) {
    suggestions.push({
      category: 'formatting',
      priority: 'medium',
      message: 'Your resume is too short. Aim for 400-800 words.',
      estimatedImpact: 'medium',
      source: 'algorithmic',
    });
  }

  if (wordCount > 1200) {
    suggestions.push({
      category: 'formatting',
      priority: 'low',
      message: 'Your resume is quite long. Consider focusing on the most relevant experience.',
      estimatedImpact: 'low',
      source: 'algorithmic',
    });
  }

  return {
    keyword_score,
    skills_score,
    experience_score,
    education_score,
    formatting_score,
    matched_keywords,
    missing_keywords,
    skill_gaps,
    suggestions,
    detail: {
      resume_skills: resumeSkills,
      job_skills: jobSkills,
      action_verb_count: actionVerbs,
      quantified_achievements: quantified,
      word_count: wordCount,
      section_coverage: sections,
    },
  };
}

// ============================================================================
// Stage 2: AI Semantic Analysis (requires Groq API key)
// ============================================================================

async function semanticAnalysis(
  apiKey: string,
  resumeText: string,
  jobDescription: string,
  jobTitle: string
): Promise<ATSSuggestion[]> {
  try {
    const response = await callGroq(apiKey, [
      { role: 'system', content: ATS_ANALYSIS_PROMPT },
      {
        role: 'user',
        content: `Resume:\n${resumeText.slice(0, 6000)}\n\nJob Title: ${jobTitle}\n\nJob Description:\n${jobDescription.slice(0, 4000)}`,
      },
    ], {
      model: AI_MODELS.BALANCED,
      temperature: 0.2,
      max_tokens: 2048,
      json_mode: true,
    });

    const parsed = JSON.parse(response);
    const aiSuggestions: ATSSuggestion[] = (parsed.suggestions || []).map((s: any) => ({
      ...s,
      source: 'semantic' as const,
    }));

    return aiSuggestions;
  } catch {
    return [];
  }
}

// ============================================================================
// Combined ATS Analysis
// ============================================================================

export const ATSAnalyzerService = {
  async analyze(
    resumeText: string,
    jobDescription: string,
    jobTitle: string,
    resumeId: string,
    jobId: string | null,
    groqApiKey: string | null
  ): Promise<ATSAnalysis> {
    // Stage 1: Algorithmic
    const algo = algorithmicAnalysis(resumeText, jobDescription, jobTitle);

    // Stage 2: AI Semantic (optional)
    let aiSuggestions: ATSSuggestion[] = [];
    if (groqApiKey) {
      aiSuggestions = await semanticAnalysis(groqApiKey, resumeText, jobDescription, jobTitle);
    }

    // Combine suggestions
    const allSuggestions = [...algo.suggestions, ...aiSuggestions];

    // Calculate overall score (weighted average)
    const overall_score = Math.round(
      algo.keyword_score * 0.25 +
      algo.skills_score * 0.30 +
      algo.experience_score * 0.20 +
      algo.education_score * 0.10 +
      algo.formatting_score * 0.15
    );

    return {
      id: generateId(),
      resume_id: resumeId,
      job_id: jobId,
      job_description: jobDescription,
      job_title: jobTitle,
      overall_score,
      keyword_score: algo.keyword_score,
      skills_score: algo.skills_score,
      experience_score: algo.experience_score,
      education_score: algo.education_score,
      formatting_score: algo.formatting_score,
      matched_keywords: algo.matched_keywords,
      missing_keywords: algo.missing_keywords,
      skill_gaps: algo.skill_gaps,
      suggestions: allSuggestions,
      analysis_detail: algo.detail,
      created_at: nowISO(),
    };
  },
};
