type SkillEntry = {
  canonical: string;
  aliases: string[];
  category: string;
};

export const SKILL_DICTIONARY: SkillEntry[] = [
  // Programming Languages
  { canonical: 'JavaScript', aliases: ['js', 'ecmascript', 'es6', 'es2015'], category: 'Programming Languages' },
  { canonical: 'TypeScript', aliases: ['ts'], category: 'Programming Languages' },
  { canonical: 'Python', aliases: ['py', 'python3'], category: 'Programming Languages' },
  { canonical: 'Java', aliases: ['jdk', 'j2ee'], category: 'Programming Languages' },
  { canonical: 'C#', aliases: ['csharp', 'c sharp', '.net c#'], category: 'Programming Languages' },
  { canonical: 'C++', aliases: ['cpp', 'cplusplus'], category: 'Programming Languages' },
  { canonical: 'Go', aliases: ['golang'], category: 'Programming Languages' },
  { canonical: 'Rust', aliases: [], category: 'Programming Languages' },
  { canonical: 'Swift', aliases: [], category: 'Programming Languages' },
  { canonical: 'Kotlin', aliases: ['kt'], category: 'Programming Languages' },
  { canonical: 'Ruby', aliases: ['rb'], category: 'Programming Languages' },
  { canonical: 'PHP', aliases: ['php8', 'php7'], category: 'Programming Languages' },
  { canonical: 'Scala', aliases: [], category: 'Programming Languages' },
  { canonical: 'R', aliases: ['r-lang', 'rlang'], category: 'Programming Languages' },
  { canonical: 'Dart', aliases: [], category: 'Programming Languages' },
  { canonical: 'SQL', aliases: ['structured query language'], category: 'Programming Languages' },

  // Frontend
  { canonical: 'React', aliases: ['reactjs', 'react.js'], category: 'Frontend' },
  { canonical: 'React Native', aliases: ['rn', 'react-native'], category: 'Frontend' },
  { canonical: 'Angular', aliases: ['angularjs', 'angular.js', 'ng'], category: 'Frontend' },
  { canonical: 'Vue.js', aliases: ['vue', 'vuejs'], category: 'Frontend' },
  { canonical: 'Next.js', aliases: ['nextjs', 'next'], category: 'Frontend' },
  { canonical: 'Svelte', aliases: ['sveltekit'], category: 'Frontend' },
  { canonical: 'HTML', aliases: ['html5'], category: 'Frontend' },
  { canonical: 'CSS', aliases: ['css3', 'stylesheet'], category: 'Frontend' },
  { canonical: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'], category: 'Frontend' },
  { canonical: 'Redux', aliases: ['redux toolkit', 'rtk'], category: 'Frontend' },
  { canonical: 'jQuery', aliases: ['jquery'], category: 'Frontend' },

  // Backend
  { canonical: 'Node.js', aliases: ['node', 'nodejs', 'node.js'], category: 'Backend' },
  { canonical: 'Express.js', aliases: ['express', 'expressjs'], category: 'Backend' },
  { canonical: 'Django', aliases: ['django rest', 'drf'], category: 'Backend' },
  { canonical: 'Flask', aliases: [], category: 'Backend' },
  { canonical: 'FastAPI', aliases: ['fast api'], category: 'Backend' },
  { canonical: 'Spring Boot', aliases: ['spring', 'spring framework'], category: 'Backend' },
  { canonical: 'ASP.NET', aliases: ['asp.net core', 'dotnet', '.net'], category: 'Backend' },
  { canonical: 'Ruby on Rails', aliases: ['rails', 'ror'], category: 'Backend' },
  { canonical: 'Laravel', aliases: [], category: 'Backend' },
  { canonical: 'NestJS', aliases: ['nest.js', 'nest'], category: 'Backend' },
  { canonical: 'GraphQL', aliases: ['gql'], category: 'Backend' },
  { canonical: 'REST API', aliases: ['restful', 'rest apis', 'api development'], category: 'Backend' },

  // Databases
  { canonical: 'PostgreSQL', aliases: ['postgres', 'psql', 'pg'], category: 'Databases' },
  { canonical: 'MySQL', aliases: ['mariadb'], category: 'Databases' },
  { canonical: 'MongoDB', aliases: ['mongo', 'nosql'], category: 'Databases' },
  { canonical: 'Redis', aliases: [], category: 'Databases' },
  { canonical: 'SQLite', aliases: ['sqlite3'], category: 'Databases' },
  { canonical: 'Firebase', aliases: ['firestore'], category: 'Databases' },
  { canonical: 'Supabase', aliases: [], category: 'Databases' },
  { canonical: 'DynamoDB', aliases: ['dynamo'], category: 'Databases' },
  { canonical: 'Elasticsearch', aliases: ['elastic', 'es'], category: 'Databases' },

  // Cloud & DevOps
  { canonical: 'AWS', aliases: ['amazon web services', 'amazon aws'], category: 'Cloud & DevOps' },
  { canonical: 'Azure', aliases: ['microsoft azure'], category: 'Cloud & DevOps' },
  { canonical: 'GCP', aliases: ['google cloud', 'google cloud platform'], category: 'Cloud & DevOps' },
  { canonical: 'Docker', aliases: ['containerization', 'docker compose'], category: 'Cloud & DevOps' },
  { canonical: 'Kubernetes', aliases: ['k8s'], category: 'Cloud & DevOps' },
  { canonical: 'CI/CD', aliases: ['continuous integration', 'continuous deployment', 'cicd'], category: 'Cloud & DevOps' },
  { canonical: 'Terraform', aliases: ['iac', 'infrastructure as code'], category: 'Cloud & DevOps' },
  { canonical: 'Jenkins', aliases: [], category: 'Cloud & DevOps' },
  { canonical: 'GitHub Actions', aliases: ['gh actions'], category: 'Cloud & DevOps' },
  { canonical: 'Linux', aliases: ['unix', 'bash', 'shell scripting'], category: 'Cloud & DevOps' },
  { canonical: 'Nginx', aliases: ['reverse proxy'], category: 'Cloud & DevOps' },
  { canonical: 'Vercel', aliases: [], category: 'Cloud & DevOps' },

  // Data & AI/ML
  { canonical: 'Machine Learning', aliases: ['ml', 'deep learning', 'dl'], category: 'Data & AI' },
  { canonical: 'TensorFlow', aliases: ['tf'], category: 'Data & AI' },
  { canonical: 'PyTorch', aliases: ['torch'], category: 'Data & AI' },
  { canonical: 'Pandas', aliases: [], category: 'Data & AI' },
  { canonical: 'NumPy', aliases: ['numpy'], category: 'Data & AI' },
  { canonical: 'Data Analysis', aliases: ['data analytics', 'data science'], category: 'Data & AI' },
  { canonical: 'NLP', aliases: ['natural language processing'], category: 'Data & AI' },
  { canonical: 'Computer Vision', aliases: ['cv', 'image recognition'], category: 'Data & AI' },

  // Tools & Methods
  { canonical: 'Git', aliases: ['github', 'gitlab', 'version control'], category: 'Tools' },
  { canonical: 'Agile', aliases: ['scrum', 'kanban', 'sprint'], category: 'Methods' },
  { canonical: 'Jira', aliases: ['atlassian'], category: 'Tools' },
  { canonical: 'Figma', aliases: ['ui/ux design'], category: 'Tools' },
  { canonical: 'Testing', aliases: ['unit testing', 'jest', 'mocha', 'cypress', 'selenium', 'tdd'], category: 'Tools' },
  { canonical: 'Webpack', aliases: ['bundler', 'vite', 'rollup'], category: 'Tools' },

  // Soft Skills
  { canonical: 'Leadership', aliases: ['team lead', 'team management'], category: 'Soft Skills' },
  { canonical: 'Communication', aliases: ['written communication', 'verbal communication'], category: 'Soft Skills' },
  { canonical: 'Problem Solving', aliases: ['analytical thinking', 'critical thinking'], category: 'Soft Skills' },
  { canonical: 'Project Management', aliases: ['pm', 'project planning'], category: 'Soft Skills' },
  { canonical: 'Teamwork', aliases: ['collaboration', 'team player'], category: 'Soft Skills' },
];

export function normalizeSkill(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const entry of SKILL_DICTIONARY) {
    if (entry.canonical.toLowerCase() === lower) return entry.canonical;
    if (entry.aliases.some((a) => a.toLowerCase() === lower)) return entry.canonical;
  }
  return raw.trim();
}

export function findSkillMatches(userSkills: string[], jobSkills: string[]): {
  matched: string[];
  missing: string[];
} {
  const normalizedUserList = userSkills.map((s) => normalizeSkill(s).toLowerCase());
  const normalizedUserSet = new Set(normalizedUserList);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    const norm = normalizeSkill(skill).toLowerCase();
    if (normalizedUserSet.has(norm)) {
      matched.push(skill);
    } else {
      // Fuzzy check: partial substring match (still O(n) but only for non-exact matches)
      const fuzzyMatch = normalizedUserList.some(
        (u) => u.includes(norm) || norm.includes(u)
      );
      if (fuzzyMatch) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }
  }

  return { matched, missing };
}
