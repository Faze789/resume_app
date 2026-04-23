import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ============================================================================
// Param Lists
// ============================================================================

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Jobs: NavigatorScreenParams<JobsStackParamList>;
  ResumeBuilder: NavigatorScreenParams<ResumeStackParamList>;
  ATSChecker: NavigatorScreenParams<ATSStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ProfileEdit: undefined;
};

export type JobsStackParamList = {
  JobsList: undefined;
  JobDetail: { jobId: string };
  SavedJobs: undefined;
};

export type ResumeStackParamList = {
  ResumesList: undefined;
  ResumeEditor: { resumeId?: string };
  ResumePreview: { resumeId: string };
  ResumeTips: undefined;
};

export type ATSStackParamList = {
  ATSHome: { jobId?: string } | undefined;
  ATSResult: { analysisId: string };
};

// ============================================================================
// Screen Props
// ============================================================================

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type JobsScreenProps<T extends keyof JobsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<JobsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

export type ResumeScreenProps<T extends keyof ResumeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ResumeStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

export type ATSScreenProps<T extends keyof ATSStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ATSStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;
