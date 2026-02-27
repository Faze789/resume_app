import type { UserProfile } from '../types/models';

type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

function isValidUrl(url: string, requiredHost: string): boolean {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.endsWith(requiredHost);
  } catch {
    return false;
  }
}

export function validateProfileForm(data: Partial<UserProfile>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.full_name?.trim()) {
    errors.full_name = 'Full name is required';
  }

  if (data.experience_years != null && (data.experience_years < 0 || data.experience_years > 50)) {
    errors.experience_years = 'Experience years must be between 0 and 50';
  }

  if (data.desired_salary_min != null && data.desired_salary_max != null) {
    if (data.desired_salary_min > data.desired_salary_max) {
      errors.salary = 'Minimum salary cannot exceed maximum';
    }
  }

  if (data.linkedin_url && !isValidUrl(data.linkedin_url, 'linkedin.com')) {
    errors.linkedin_url = 'Please enter a valid LinkedIn URL';
  }

  if (data.github_url && !isValidUrl(data.github_url, 'github.com')) {
    errors.github_url = 'Please enter a valid GitHub URL';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function calculateProfileCompleteness(profile: UserProfile): number {
  const checks = [
    !!profile.full_name?.trim(),
    !!profile.headline?.trim(),
    !!profile.location?.trim(),
    !!profile.phone?.trim(),
    profile.skills.length > 0,
    profile.experience_years > 0,
    profile.desired_job_types.length > 0,
    profile.desired_locations.length > 0,
    !!profile.linkedin_url || !!profile.github_url,
    !!profile.bio?.trim(),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
