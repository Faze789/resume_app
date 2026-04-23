import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export const ResumeUploadService = {
  /**
   * Upload a resume PDF to Supabase Storage and update the user's profile.
   * Uses upsert to replace any existing file.
   */
  async uploadResume(userId: string, fileUri: string): Promise<string> {
    const storagePath = `${userId}/current_resume.pdf`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    // Upload with upsert (replaces existing file)
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, decode(base64), {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Store the storage path as resume_url
    const resumeUrl = `resumes/${storagePath}`;

    // Update profile with resume_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ resume_url: resumeUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

    return resumeUrl;
  },

  /**
   * Get a temporary signed download URL for the user's resume (1 hour expiry).
   */
  async getResumeDownloadUrl(userId: string): Promise<string | null> {
    const storagePath = `${userId}/current_resume.pdf`;
    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(storagePath, 3600);
    if (error) return null;
    return data.signedUrl;
  },
};
