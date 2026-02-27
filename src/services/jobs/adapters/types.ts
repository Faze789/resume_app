export type NormalizedJob = {
  title: string;
  company_name: string;
  company_logo_url: string | null;
  description: string;
  requirements: string[];
  skills_required: string[];
  location: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_type: string;
  experience_level: string;
  source_platform: string;
  source_url: string | null;
  external_id: string;
  posted_at: string;
  metadata: Record<string, any>;
};

export interface IJobAdapter {
  platformName: string;
  requiresApiKey: boolean;
  fetch(query: string, location?: string): Promise<NormalizedJob[]>;
}
