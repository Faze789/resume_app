// ============================================================================
// Domain Map — Maps skills/interests to broader professional domains
// for semantic query expansion and domain-level scoring.
// ============================================================================

export type DomainEntry = {
  id: string;
  name: string;
  /** Skills, headline words, or raw terms that activate this domain (lowercase) */
  triggers: string[];
  /** Broader job titles to use as expanded search queries */
  relatedRoles: string[];
  /** Keywords for domain-level partial-credit scoring */
  domainKeywords: string[];
};

export const DOMAIN_MAP: DomainEntry[] = [
  // ── Tech Domains ──────────────────────────────────────────────────────

  {
    id: 'mobile-dev',
    name: 'Mobile Development',
    triggers: [
      'flutter', 'dart', 'react native', 'swift', 'kotlin',
      'ios', 'android', 'mobile', 'xamarin', 'ionic', 'cordova',
      'swiftui', 'jetpack compose',
    ],
    relatedRoles: [
      'Mobile Developer', 'Software Developer', 'Application Developer',
      'Mobile Engineer', 'Software Engineer', 'App Developer',
    ],
    domainKeywords: [
      'mobile', 'app', 'ios', 'android', 'application', 'software',
    ],
  },
  {
    id: 'frontend-dev',
    name: 'Frontend Development',
    triggers: [
      'react', 'angular', 'vue.js', 'vue', 'svelte', 'next.js',
      'html', 'css', 'tailwind css', 'tailwind', 'redux', 'jquery',
      'frontend', 'front-end', 'front end', 'ui developer',
      'gatsby', 'nuxt', 'webpack', 'vite',
    ],
    relatedRoles: [
      'Frontend Developer', 'UI Developer', 'Web Developer',
      'Software Engineer', 'Frontend Engineer', 'JavaScript Developer',
    ],
    domainKeywords: [
      'frontend', 'front-end', 'ui', 'web', 'interface', 'client-side', 'javascript',
    ],
  },
  {
    id: 'backend-dev',
    name: 'Backend Development',
    triggers: [
      'node.js', 'express.js', 'django', 'flask', 'fastapi',
      'spring boot', 'asp.net', '.net', 'ruby on rails', 'laravel',
      'nestjs', 'graphql', 'rest api', 'backend', 'back-end', 'back end',
      'microservices', 'api development',
    ],
    relatedRoles: [
      'Backend Developer', 'Software Engineer', 'Server-Side Developer',
      'API Developer', 'Backend Engineer', 'Software Developer',
    ],
    domainKeywords: [
      'backend', 'back-end', 'server', 'api', 'microservices', 'software',
    ],
  },
  {
    id: 'fullstack-dev',
    name: 'Full Stack Development',
    triggers: [
      'full stack', 'fullstack', 'full-stack', 'mern', 'mean', 'lamp',
    ],
    relatedRoles: [
      'Full Stack Developer', 'Software Engineer', 'Web Developer',
      'Full Stack Engineer', 'Software Developer',
    ],
    domainKeywords: [
      'full stack', 'fullstack', 'full-stack', 'web', 'software',
    ],
  },
  {
    id: 'data-ai',
    name: 'Data Science & AI',
    triggers: [
      'machine learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
      'data analysis', 'data science', 'data analytics', 'nlp',
      'natural language processing', 'computer vision', 'deep learning',
      'scikit-learn', 'keras', 'jupyter', 'statistics', 'big data',
      'data engineering', 'spark', 'hadoop', 'airflow',
    ],
    relatedRoles: [
      'Data Scientist', 'Machine Learning Engineer', 'AI Engineer',
      'Data Analyst', 'Research Scientist', 'Data Engineer',
    ],
    domainKeywords: [
      'data', 'machine learning', 'ai', 'artificial intelligence',
      'analytics', 'modeling', 'science',
    ],
  },
  {
    id: 'devops-cloud',
    name: 'DevOps & Cloud',
    triggers: [
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes',
      'terraform', 'ci/cd', 'jenkins', 'github actions', 'devops',
      'linux', 'nginx', 'ansible', 'chef', 'puppet', 'cloudformation',
      'helm', 'prometheus', 'grafana',
    ],
    relatedRoles: [
      'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer',
      'Infrastructure Engineer', 'Platform Engineer', 'Systems Engineer',
    ],
    domainKeywords: [
      'devops', 'cloud', 'infrastructure', 'deployment', 'operations', 'sre',
    ],
  },
  {
    id: 'database',
    name: 'Database & Data Engineering',
    triggers: [
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'dynamodb', 'database', 'sql', 'cassandra', 'neo4j', 'oracle db',
      'sql server', 'dba',
    ],
    relatedRoles: [
      'Database Administrator', 'Data Engineer', 'Database Developer',
      'Backend Developer', 'Software Engineer',
    ],
    domainKeywords: [
      'database', 'data engineering', 'sql', 'etl', 'data pipeline',
    ],
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    triggers: [
      'cybersecurity', 'security', 'penetration testing', 'ethical hacking',
      'soc', 'siem', 'firewall', 'vulnerability', 'infosec',
      'information security', 'network security',
    ],
    relatedRoles: [
      'Security Engineer', 'Cybersecurity Analyst', 'Security Consultant',
      'Information Security Analyst', 'Penetration Tester',
    ],
    domainKeywords: [
      'security', 'cybersecurity', 'infosec', 'threat', 'compliance',
    ],
  },
  {
    id: 'qa-testing',
    name: 'Quality Assurance',
    triggers: [
      'testing', 'qa', 'quality assurance', 'selenium', 'cypress',
      'jest', 'mocha', 'automation testing', 'manual testing',
      'test engineer', 'sdet',
    ],
    relatedRoles: [
      'QA Engineer', 'Test Engineer', 'SDET', 'Quality Assurance Analyst',
      'Software Tester', 'Automation Engineer',
    ],
    domainKeywords: [
      'testing', 'qa', 'quality', 'automation', 'test',
    ],
  },

  // ── Non-Tech Domains ──────────────────────────────────────────────────

  {
    id: 'healthcare',
    name: 'Healthcare',
    triggers: [
      'anesthesia', 'anesthesiology', 'anesthesiologist', 'nursing', 'nurse',
      'medical', 'clinical', 'pharmacy', 'pharmacist', 'radiology',
      'surgery', 'surgeon', 'physician', 'healthcare', 'hospital',
      'patient care', 'therapist', 'therapy', 'dentist', 'dental',
      'optometry', 'dermatology', 'cardiology', 'oncology', 'pediatrics',
      'psychiatry', 'veterinary', 'paramedic', 'emt', 'phlebotomy',
    ],
    relatedRoles: [
      'Healthcare Professional', 'Medical Officer', 'Clinical Specialist',
      'Hospital Staff', 'Health Services Professional', 'Medical Practitioner',
    ],
    domainKeywords: [
      'medical', 'clinical', 'hospital', 'healthcare', 'patient', 'health',
    ],
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    triggers: [
      'accounting', 'finance', 'auditing', 'bookkeeping', 'cpa',
      'financial analysis', 'investment', 'banking', 'tax',
      'actuary', 'actuarial', 'portfolio', 'trading', 'fintech',
      'risk management', 'compliance', 'controller',
    ],
    relatedRoles: [
      'Financial Analyst', 'Accountant', 'Finance Manager',
      'Investment Analyst', 'Banking Professional', 'Auditor',
    ],
    domainKeywords: [
      'finance', 'financial', 'accounting', 'banking', 'investment', 'fiscal',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Communications',
    triggers: [
      'marketing', 'seo', 'content writing', 'social media', 'branding',
      'advertising', 'pr', 'public relations', 'copywriting',
      'digital marketing', 'sem', 'ppc', 'email marketing',
      'growth hacking', 'content strategy', 'analytics',
    ],
    relatedRoles: [
      'Marketing Manager', 'Digital Marketer', 'Content Strategist',
      'Marketing Specialist', 'Brand Manager', 'Growth Manager',
    ],
    domainKeywords: [
      'marketing', 'brand', 'advertising', 'content', 'campaign', 'communications',
    ],
  },
  {
    id: 'design',
    name: 'Design & Creative',
    triggers: [
      'figma', 'ui/ux', 'graphic design', 'ux design', 'ui design',
      'product design', 'illustration', 'adobe', 'photoshop', 'sketch',
      'interaction design', 'visual design', 'motion design',
      'user research', 'wireframe', 'prototype',
    ],
    relatedRoles: [
      'UX Designer', 'UI Designer', 'Product Designer',
      'Graphic Designer', 'Visual Designer', 'Interaction Designer',
    ],
    domainKeywords: [
      'design', 'creative', 'visual', 'user experience', 'ux', 'ui',
    ],
  },
  {
    id: 'education',
    name: 'Education & Training',
    triggers: [
      'teaching', 'education', 'curriculum', 'instructor', 'professor',
      'tutoring', 'e-learning', 'training', 'academic', 'lecturer',
      'pedagogy', 'edtech',
    ],
    relatedRoles: [
      'Teacher', 'Instructor', 'Education Specialist',
      'Training Coordinator', 'Curriculum Developer', 'Academic Advisor',
    ],
    domainKeywords: [
      'education', 'teaching', 'academic', 'learning', 'training', 'school',
    ],
  },
  {
    id: 'legal',
    name: 'Legal',
    triggers: [
      'law', 'legal', 'attorney', 'lawyer', 'paralegal', 'compliance',
      'litigation', 'contract law', 'corporate law', 'intellectual property',
      'patent', 'trademark',
    ],
    relatedRoles: [
      'Attorney', 'Legal Counsel', 'Paralegal',
      'Compliance Officer', 'Legal Analyst', 'Legal Advisor',
    ],
    domainKeywords: [
      'legal', 'law', 'compliance', 'litigation', 'regulatory',
    ],
  },
  {
    id: 'engineering-nonsoft',
    name: 'Engineering (Non-Software)',
    triggers: [
      'mechanical engineering', 'civil engineering', 'electrical engineering',
      'chemical engineering', 'structural', 'cad', 'autocad', 'solidworks',
      'aerospace', 'biomedical', 'environmental engineering', 'industrial engineering',
      'manufacturing', 'robotics',
    ],
    relatedRoles: [
      'Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer',
      'Project Engineer', 'Design Engineer', 'Process Engineer',
    ],
    domainKeywords: [
      'engineering', 'technical', 'design', 'manufacturing', 'construction',
    ],
  },
  {
    id: 'project-management',
    name: 'Project & Product Management',
    triggers: [
      'project management', 'product management', 'scrum master', 'agile',
      'pmp', 'product owner', 'program manager', 'scrum', 'kanban',
      'prince2', 'delivery manager',
    ],
    relatedRoles: [
      'Project Manager', 'Product Manager', 'Program Manager',
      'Scrum Master', 'Delivery Manager', 'Technical Program Manager',
    ],
    domainKeywords: [
      'project', 'product', 'management', 'delivery', 'agile', 'scrum',
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Business Development',
    triggers: [
      'sales', 'business development', 'account management', 'crm',
      'salesforce', 'lead generation', 'b2b', 'b2c', 'revenue',
      'account executive', 'partnerships',
    ],
    relatedRoles: [
      'Sales Manager', 'Account Executive', 'Business Development Manager',
      'Sales Representative', 'Account Manager',
    ],
    domainKeywords: [
      'sales', 'business', 'revenue', 'account', 'client',
    ],
  },
  {
    id: 'hr',
    name: 'Human Resources',
    triggers: [
      'human resources', 'hr', 'recruiting', 'recruitment', 'talent acquisition',
      'payroll', 'employee relations', 'onboarding', 'compensation',
      'benefits', 'hris',
    ],
    relatedRoles: [
      'HR Manager', 'Recruiter', 'Talent Acquisition Specialist',
      'HR Business Partner', 'People Operations Manager',
    ],
    domainKeywords: [
      'hr', 'human resources', 'recruiting', 'talent', 'people',
    ],
  },
];

/**
 * Resolve which domains a user belongs to based on their headline and skills.
 * Returns matched domains sorted by trigger-hit count (best first), capped at 3.
 */
export function resolveUserDomains(
  headline: string | null,
  skills: string[],
): DomainEntry[] {
  const headlineLower = (headline || '').toLowerCase();
  const skillsLower = skills.map((s) => s.toLowerCase());

  const scored: { domain: DomainEntry; hits: number }[] = [];

  for (const domain of DOMAIN_MAP) {
    let hits = 0;

    for (const trigger of domain.triggers) {
      // Check headline (substring match)
      if (headlineLower.includes(trigger)) {
        hits++;
      }
      // Check skills (exact or substring match)
      if (skillsLower.some((s) => s === trigger || s.includes(trigger) || trigger.includes(s))) {
        hits++;
      }
    }

    if (hits > 0) {
      scored.push({ domain, hits });
    }
  }

  // Sort by hit count descending, take top 3
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 3).map((s) => s.domain);
}

/**
 * Collect expanded role titles from matched domains, deduplicated.
 */
export function getExpandedRoles(domains: DomainEntry[]): string[] {
  const seen = new Set<string>();
  const roles: string[] = [];

  for (const domain of domains) {
    for (const role of domain.relatedRoles) {
      const lower = role.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        roles.push(role);
      }
    }
  }

  return roles;
}

/**
 * Collect domain keywords from matched domains, deduplicated.
 */
export function getDomainKeywords(domains: DomainEntry[]): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const domain of domains) {
    for (const kw of domain.domainKeywords) {
      const lower = kw.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        keywords.push(kw);
      }
    }
  }

  return keywords;
}
