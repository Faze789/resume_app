import { supabase } from './supabase';
import type { UserProfile } from '../types/models';

function mapRowToProfile(data: any): UserProfile {
  return {
    ...data,
    skills: data.skills || [],
    experience_years: data.experience_years || 0,
    desired_job_types: data.desired_job_types || [],
    desired_locations: data.desired_locations || [],
    resume_url: data.resume_url || null,
    is_open_to_work: data.is_open_to_work ?? true,
    onboarding_complete: data.onboarding_complete ?? false,
    parse_confidence: data.parse_confidence || null,
    metadata: data.metadata || {},
  } as UserProfile;
}

export const AuthService = {
  async signUp(email: string, password: string, fullName: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign up failed');

    // If email confirmation is required, there's no session yet.
    // Return null to signal "confirmation pending".
    if (!data.session) {
      return null;
    }

    // Session exists (email auto-confirmed) — fetch the profile.
    let profile: UserProfile | null = null;
    for (let i = 0; i < 5; i++) {
      profile = await this.fetchProfile(data.user.id);
      if (profile) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!profile) throw new Error('Profile creation failed — please try again');
    return profile;
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign in failed');

    const profile = await this.fetchProfile(data.user.id);
    if (!profile) throw new Error('Profile not found');
    return profile;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession(): Promise<UserProfile | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return this.fetchProfile(session.user.id);
  },

  async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return mapRowToProfile(data);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToProfile(data);
  },
};
