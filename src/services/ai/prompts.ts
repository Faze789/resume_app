export const RESUME_PARSE_PROMPT = `You are an expert resume parser. Your job is to extract EVERY detail from the resume text. Be thorough and aggressive — extract everything you can find. Do NOT leave fields null if there is any hint of the information in the text.

Return a JSON object with this exact structure:
{
  "profile": {
    "full_name": "string (REQUIRED - look for the largest/boldest name at top, or any personal name)",
    "headline": "string (derive from most recent job title, e.g. 'Software Engineer' or 'Flutter Developer')",
    "location": "string (city, state/country — look for addresses, city names, or location indicators)",
    "phone": "string (any phone/mobile number, with country code if present)",
    "email": "string (any email address found anywhere in the resume)",
    "skills": ["COMPLETE flat list of ALL skills, technologies, tools, programming languages, frameworks, methodologies, soft skills mentioned ANYWHERE in the resume — in skills section, experience bullets, projects, certifications, summary, etc."],
    "experience_years": "number (calculate from earliest work start date to latest end date or current year. If only graduation year exists, estimate from graduation year to now. If fresher/student, use 0)",
    "linkedin_url": "string or null",
    "github_url": "string or null",
    "portfolio_url": "string or null (any personal website, blog, or portfolio link)",
    "bio": "string (use the summary/objective section if present. If none, generate a 2-sentence professional summary from the resume content)"
  },
  "resume_content": {
    "personal_info": {
      "full_name": "string",
      "email": "string",
      "phone": "string or null",
      "location": "string or null",
      "linkedin": "string or null",
      "github": "string or null",
      "portfolio": "string or null"
    },
    "summary": "professional summary text (copy from resume or generate from content)",
    "sections": [
      {
        "type": "experience",
        "title": "Work Experience",
        "items": [
          {
            "id": "exp_1",
            "title": "Job Title",
            "organization": "Company Name",
            "location": "City, State/Country or null",
            "start_date": "MM/YYYY",
            "end_date": "MM/YYYY or null if current",
            "is_current": true/false,
            "bullets": ["achievement/responsibility 1", "achievement 2"],
            "skills_used": ["technologies and skills mentioned in this role"]
          }
        ]
      },
      {
        "type": "education",
        "title": "Education",
        "items": [
          {
            "id": "edu_1",
            "title": "Degree Name (e.g. B.Tech in Computer Science)",
            "organization": "University/School Name",
            "location": "City or null",
            "start_date": "YYYY",
            "end_date": "YYYY or null",
            "description": "GPA, honors, relevant coursework, achievements"
          }
        ]
      },
      {
        "type": "skills",
        "title": "Skills",
        "items": [
          {
            "id": "skill_1",
            "category": "Programming Languages",
            "skills": ["Python", "JavaScript", "etc."]
          },
          {
            "id": "skill_2",
            "category": "Frameworks & Libraries",
            "skills": ["React", "Flutter", "etc."]
          }
        ]
      },
      {
        "type": "projects",
        "title": "Projects",
        "items": [
          {
            "id": "proj_1",
            "title": "Project Name",
            "description": "What the project does",
            "bullets": ["key feature 1", "key feature 2"],
            "skills_used": ["technologies used"],
            "url": "project link or null"
          }
        ]
      },
      {
        "type": "certifications",
        "title": "Certifications",
        "items": [
          {
            "id": "cert_1",
            "title": "Certification Name",
            "organization": "Issuing Organization",
            "date": "MM/YYYY or YYYY",
            "url": "credential URL or null"
          }
        ]
      }
    ]
  },
  "confidence": {
    "full_name": { "score": 0.9, "reason": "clearly found at top of resume" },
    "headline": { "score": 0.8, "reason": "derived from most recent job title" },
    "location": { "score": 0.8, "reason": "found in contact section" },
    "phone": { "score": 0.9, "reason": "phone number found" },
    "skills": { "score": 0.9, "reason": "extracted from skills section and experience" },
    "experience_years": { "score": 0.8, "reason": "calculated from work dates" },
    "bio": { "score": 0.7, "reason": "summary section found" }
  }
}

CRITICAL EXTRACTION RULES:
1. SKILLS: Extract EVERY skill mentioned anywhere — job descriptions, project descriptions, skills sections, tools used, certifications. Include programming languages, frameworks, databases, tools, cloud services, methodologies (Agile, Scrum), and soft skills. A resume might have 15-50+ skills — extract them ALL as a flat array.
2. HEADLINE: If no explicit headline/title exists, use the MOST RECENT job title (e.g., "Software Engineer at Google" → headline = "Software Engineer").
3. EXPERIENCE YEARS: Calculate precisely. If work started in 2020 and it's now 2025, that's 5 years. For students/freshers with no work experience, use 0.
4. BIO: If a summary/objective section exists, copy it. If not, write a brief 2-sentence professional summary based on their experience and skills.
5. LOCATION: Look for city/state/country in the header, contact info, or address section.
6. PHONE: Look for any phone number pattern (with or without country code).
7. URLS: Extract LinkedIn, GitHub, portfolio, and any other URLs found.
8. PROJECTS: Extract all projects with their tech stacks listed in skills_used.
9. CERTIFICATIONS: Extract all certifications, courses, and professional development.
10. DO NOT return empty arrays for skills — there should always be skills extractable from any resume.
11. Give HIGH confidence scores (0.8-1.0) when data is clearly present. Only give low scores when you truly had to guess.`;

export const RESUME_IMPROVE_PROMPT = `You are an expert resume writer and ATS optimization specialist.

Improve the following resume section by:
1. Using strong action verbs (Led, Developed, Implemented, Increased, Reduced)
2. Adding quantifiable metrics where possible (percentages, numbers, dollar amounts)
3. Making bullet points concise (1-2 lines each)
4. Ensuring ATS-friendly formatting (standard terminology, relevant keywords)
5. Highlighting impact and results, not just responsibilities

Return the improved section in the same JSON structure as the input.
Only modify the text content (titles, bullets, descriptions). Do NOT change IDs, dates, or organization names.`;

export const ATS_ANALYSIS_PROMPT = `You are an expert ATS (Applicant Tracking System) analyzer.

Analyze how well this resume matches the given job description. Identify:

1. **Skill Equivalences**: Skills in the resume that match job requirements (even with different names)
2. **Missing Keywords**: Important job keywords missing from the resume
3. **Weak Bullets**: Resume bullet points that could be improved for this specific job
4. **Targeted Suggestions**: Specific, actionable improvements

Return a JSON object:
{
  "skill_equivalences": [
    { "job_skill": "string", "resume_evidence": "string", "confidence": 0.0-1.0 }
  ],
  "missing_keywords": ["keyword1", "keyword2"],
  "weak_bullets": [
    { "current": "current text", "suggestion": "improved text", "reason": "why" }
  ],
  "overall_fit_assessment": "2-3 sentence assessment",
  "suggestions": [
    {
      "category": "skills|experience|keywords|formatting",
      "priority": "critical|high|medium|low",
      "message": "specific actionable suggestion",
      "estimatedImpact": "high|medium|low"
    }
  ]
}`;

export const GENERATE_SUMMARY_PROMPT = `Write a professional resume summary (2-3 sentences) for a candidate with the following background. Make it compelling, specific, and ATS-friendly. Focus on key achievements and skills.`;

export const JOB_MATCH_ASSESSMENT_PROMPT = `You are a career advisor. Given a user's resume/profile and a job listing, provide a brief (2-3 sentence) assessment of how well they fit this role. Be specific about matching skills and any gaps.`;

export const COVER_LETTER_PROMPT = `You are an expert career coach and professional writer.
Write a compelling, personalized cover letter for the candidate applying to this specific role.

CANDIDATE PROFILE:
- Name: {name}
- Headline: {headline}
- Skills: {skills}
- Experience: {experience_years} years
- Bio: {bio}

JOB DETAILS:
- Title: {job_title}
- Company: {company_name}
- Description: {job_description}
- Required Skills: {required_skills}

INSTRUCTIONS:
1. Open with a strong, personalized hook mentioning the specific company and role
2. Highlight 2-3 of the candidate's most relevant skills/experiences that match the job requirements
3. Demonstrate understanding of the company's needs based on the job description
4. Show enthusiasm without being generic — reference specific job requirements
5. Close with a confident call-to-action
6. Keep it to 3-4 paragraphs (250-350 words)
7. Use a professional but warm tone
8. DO NOT use placeholder text like [Company Name] — use the actual values provided
9. DO NOT include a subject line or "Dear Hiring Manager" header — start with the body

Return ONLY the cover letter text, no JSON wrapping, no extra commentary.`;
