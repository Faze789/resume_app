import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { resumeStorage } from '../../services/storage/resume.storage';
import { generateId } from '../../utils/id';
import { nowISO } from '../../utils/date';
import { validateProfileForm } from '../../utils/validation';
import { DEFAULT_STYLE_CONFIG, DEFAULT_SECTION_ORDER } from '../../types/models';
import { useAppTheme } from '../../config/themes';
import { ResumeUploadService } from '../../services/resumeUpload.service';
import type { UserProfile, ParsedResumeData, ConfidenceScores, ResumeContent } from '../../types/models';

import { OnboardingProgress } from './components/OnboardingProgress';
import { ResumeChoiceStep } from './steps/ResumeChoiceStep';
import { ResumeUploadStep } from './steps/ResumeUploadStep';
import { SmartInterviewStep } from './steps/SmartInterviewStep';
import { ParsedDataReviewStep } from './steps/ParsedDataReviewStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { SkillsStep } from './steps/SkillsStep';
import { JobPreferencesStep } from './steps/JobPreferencesStep';
import { LinksStep } from './steps/LinksStep';

type OnboardingPath = 'choosing' | 'upload' | 'manual';
type UploadPhase = 'upload' | 'interview' | 'review';

export default function OnboardingScreen() {
  const { user, updateProfile } = useAuth();
  const theme = useAppTheme();

  const [path, setPath] = useState<OnboardingPath>('choosing');
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('upload');
  const [manualStep, setManualStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [parsedResumeContent, setParsedResumeContent] = useState<ResumeContent | null>(null);
  const [parsedRawText, setParsedRawText] = useState('');
  const [confidence, setConfidence] = useState<ConfidenceScores | null>(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);

  const [originalFileUri, setOriginalFileUri] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    full_name: user?.full_name || '',
    skills: [],
    desired_job_types: [],
    desired_locations: [],
    experience_years: 0,
  });

  const mergeFormData = (updates: Partial<UserProfile>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const computeOverallConfidence = (scores: ConfidenceScores): number => {
    const values = Object.values(scores).map((v) => v.score);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 1;
  };

  const getLowConfidenceFields = (scores: ConfidenceScores, threshold: number): string[] => {
    return Object.entries(scores)
      .filter(([, v]) => v.score < threshold)
      .map(([k]) => k);
  };

  const handleParsed = (data: ParsedResumeData, fileUri?: string) => {
    if (fileUri) setOriginalFileUri(fileUri);
    mergeFormData({
      ...data.profile,
      skills: data.profile.skills || [],
    });
    setParsedResumeContent(data.resume_content);
    setParsedRawText(data.raw_text);

    if (data.confidence) {
      setConfidence(data.confidence);

      // Only gate on critical missing data, not just low AI confidence scores.
      // LLMs tend to give conservative confidence even when extraction is correct.
      const isMissingCriticalData =
        !data.profile.full_name?.trim() ||
        !data.profile.skills?.length;

      if (isMissingCriticalData) {
        // Show interview only for fields that are actually empty/missing
        const emptyFields: string[] = [];
        if (!data.profile.full_name?.trim()) emptyFields.push('full_name');
        if (!data.profile.headline?.trim()) emptyFields.push('headline');
        if (!data.profile.skills?.length) emptyFields.push('skills');
        if (!data.profile.experience_years) emptyFields.push('experience_years');
        if (!data.profile.location?.trim()) emptyFields.push('location');
        if (!data.profile.phone?.trim()) emptyFields.push('phone');

        if (emptyFields.length > 0) {
          setLowConfidenceFields(emptyFields);
          setUploadPhase('interview');
          return;
        }
      }
    }

    // Data extracted successfully — go straight to review
    setUploadPhase('review');
  };

  const handleComplete = async () => {
    const { valid, errors } = validateProfileForm(formData);
    if (!valid) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    setSaving(true);
    try {
      const profileUpdates: Partial<UserProfile> = {
        headline: formData.headline?.trim() || null,
        location: formData.location?.trim() || null,
        phone: formData.phone?.trim() || null,
        bio: formData.bio?.trim() || null,
        skills: formData.skills || [],
        experience_years: formData.experience_years || 0,
        desired_job_types: formData.desired_job_types || [],
        desired_locations: formData.desired_locations || [],
        desired_salary_min: formData.desired_salary_min || null,
        desired_salary_max: formData.desired_salary_max || null,
        linkedin_url: formData.linkedin_url?.trim() || null,
        github_url: formData.github_url?.trim() || null,
        portfolio_url: formData.portfolio_url?.trim() || null,
        onboarding_complete: true,
      };

      if (confidence) {
        profileUpdates.parse_confidence = confidence;
      }

      await updateProfile(profileUpdates);

      // Save parsed resume if upload path
      if (path === 'upload' && parsedResumeContent) {
        try {
          const now = nowISO();
          await resumeStorage.upsert({
            id: generateId(),
            user_id: user!.id,
            title: 'Imported Resume',
            version: 1,
            is_primary: true,
            content: parsedResumeContent,
            section_order: DEFAULT_SECTION_ORDER,
            template_id: 'professional',
            style_config: DEFAULT_STYLE_CONFIG,
            last_ats_score: null,
            raw_text: parsedRawText,
            created_at: now,
            updated_at: now,
          });
        } catch {
          console.warn('Could not save parsed resume');
        }

        // Upload original PDF to Supabase Storage
        if (originalFileUri) {
          try {
            const resumeUrl = await ResumeUploadService.uploadResume(user!.id, originalFileUri);
            await updateProfile({ resume_url: resumeUrl });
          } catch {
            console.warn('Could not upload resume to cloud storage');
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasInterview = uploadPhase === 'interview' || lowConfidenceFields.length > 0;
  const uploadTotalSteps = hasInterview ? 3 : 2;
  const uploadCurrentStep =
    uploadPhase === 'upload' ? 0 : uploadPhase === 'interview' ? 1 : hasInterview ? 2 : 1;

  const totalSteps = path === 'upload' ? uploadTotalSteps : 4;
  const currentStep = path === 'upload' ? uploadCurrentStep : manualStep;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        {path !== 'choosing' && <OnboardingProgress current={currentStep} total={totalSteps} />}

        {path === 'choosing' && (
          <ResumeChoiceStep onHasResume={() => setPath('upload')} onNoResume={() => setPath('manual')} />
        )}

        {path === 'upload' && uploadPhase === 'upload' && (
          <ResumeUploadStep userId={user!.id} onParsed={handleParsed} onSkip={() => setPath('manual')} />
        )}

        {path === 'upload' && uploadPhase === 'interview' && (
          <SmartInterviewStep
            formData={formData}
            onUpdate={mergeFormData}
            lowConfidenceFields={lowConfidenceFields}
            onContinue={() => setUploadPhase('review')}
            onBack={() => setUploadPhase('upload')}
          />
        )}

        {path === 'upload' && uploadPhase === 'review' && (
          <ParsedDataReviewStep
            formData={formData}
            onUpdate={mergeFormData}
            onConfirm={handleComplete}
            saving={saving}
            confidence={confidence}
          />
        )}

        {path === 'manual' && manualStep === 0 && (
          <BasicInfoStep formData={formData} onUpdate={mergeFormData} onNext={() => setManualStep(1)} />
        )}
        {path === 'manual' && manualStep === 1 && (
          <SkillsStep
            formData={formData}
            onUpdate={mergeFormData}
            onNext={() => setManualStep(2)}
            onBack={() => setManualStep(0)}
          />
        )}
        {path === 'manual' && manualStep === 2 && (
          <JobPreferencesStep
            formData={formData}
            onUpdate={mergeFormData}
            onNext={() => setManualStep(3)}
            onBack={() => setManualStep(1)}
          />
        )}
        {path === 'manual' && manualStep === 3 && (
          <LinksStep
            formData={formData}
            onUpdate={mergeFormData}
            onComplete={handleComplete}
            onBack={() => setManualStep(2)}
            saving={saving}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
