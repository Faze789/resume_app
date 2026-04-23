import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, TextInput, Button, Chip, Snackbar } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { normalizeSkill } from '../../utils/skillDictionary';
import type { UserProfile, JobType } from '../../types/models';
import { useAppTheme } from '../../config/themes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const SUGGESTED_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'SQL',
  'Java', 'AWS', 'Docker', 'Git', 'REST API', 'MongoDB',
  'HTML', 'CSS', 'React Native', 'PostgreSQL', 'Machine Learning',
  'Agile', 'Communication', 'Leadership', 'Flutter', 'C#', '.NET',
  'Angular', 'Vue', 'Go', 'Kubernetes', 'Azure', 'GCP', 'Figma',
];

const JOB_TYPE_OPTIONS: { key: JobType; label: string }[] = [
  { key: 'full_time', label: 'Full Time' },
  { key: 'part_time', label: 'Part Time' },
  { key: 'contract', label: 'Contract' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'internship', label: 'Internship' },
];

type Props = NativeStackScreenProps<any, any>;

export default function ProfileEditScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { profile, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [desiredJobTypes, setDesiredJobTypes] = useState<JobType[]>(profile?.desired_job_types || []);
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState(profile?.github_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url || '');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const addSkill = (skill: string) => {
    const normalized = normalizeSkill(skill);
    if (normalized && !skills.includes(normalized)) {
      setSkills([...skills, normalized]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const toggleJobType = (type: JobType) => {
    setDesiredJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (s) => !skills.includes(s) && (!skillInput || s.toLowerCase().includes(skillInput.toLowerCase()))
  ).slice(0, 12);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Full name is required.');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        full_name: fullName.trim(),
        headline: headline.trim() || null,
        location: location.trim() || null,
        phone: phone.trim() || null,
        skills,
        desired_job_types: desiredJobTypes,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
      };

      await updateProfile(updates);
      setSnackbar(true);

      setTimeout(() => navigation.goBack(), 1200);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Basic Info */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Basic Info
          </Text>
          <TextInput
            label="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Professional Headline"
            value={headline}
            onChangeText={setHeadline}
            mode="outlined"
            placeholder="e.g., Full Stack Developer"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Location / City"
            value={location}
            onChangeText={setLocation}
            mode="outlined"
            placeholder="e.g., Karachi, Pakistan"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
        </Card.Content>
      </Card>

      {/* Skills */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Skills ({skills.length})
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={skillInput}
              onChangeText={setSkillInput}
              placeholder="Type a skill..."
              mode="outlined"
              style={[styles.skillInput, { backgroundColor: theme.colors.surface }]}
              onSubmitEditing={() => skillInput.trim() && addSkill(skillInput.trim())}
            />
            <Button
              mode="contained-tonal"
              onPress={() => skillInput.trim() && addSkill(skillInput.trim())}
              disabled={!skillInput.trim()}
              compact
            >
              Add
            </Button>
          </View>

          {skills.length > 0 && (
            <View style={styles.chips}>
              {skills.map((skill) => (
                <Chip
                  key={skill}
                  onClose={() => removeSkill(skill)}
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  textStyle={{ color: theme.colors.onPrimaryContainer }}
                >
                  {skill}
                </Chip>
              ))}
            </View>
          )}

          {filteredSuggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Suggestions
              </Text>
              <View style={styles.chips}>
                {filteredSuggestions.map((skill) => (
                  <Chip key={skill} onPress={() => addSkill(skill)} icon="plus" compact>
                    {skill}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Job Preferences */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Job Preferences
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Desired Job Types
          </Text>
          <View style={styles.chips}>
            {JOB_TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                selected={desiredJobTypes.includes(opt.key)}
                onPress={() => toggleJobType(opt.key)}
                style={desiredJobTypes.includes(opt.key) ? { backgroundColor: theme.colors.primaryContainer } : undefined}
                textStyle={desiredJobTypes.includes(opt.key) ? { color: theme.colors.onPrimaryContainer } : undefined}
              >
                {opt.label}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Links */}
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Links
          </Text>
          <TextInput
            label="LinkedIn URL"
            value={linkedinUrl}
            onChangeText={setLinkedinUrl}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="url"
            left={<TextInput.Icon icon="linkedin" />}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="GitHub URL"
            value={githubUrl}
            onChangeText={setGithubUrl}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="url"
            left={<TextInput.Icon icon="github" />}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
          <TextInput
            label="Portfolio URL"
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="url"
            left={<TextInput.Icon icon="web" />}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
        </Card.Content>
      </Card>

      {/* Save */}
      <Button
        mode="contained"
        icon="content-save"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
        contentStyle={styles.saveContent}
      >
        Save Profile
      </Button>

      <Snackbar
        visible={snackbar}
        onDismiss={() => setSnackbar(false)}
        duration={2000}
      >
        Profile updated! Refreshing your job matches...
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  card: { marginBottom: 16, borderRadius: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 14 },
  input: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  skillInput: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionsSection: { marginTop: 16 },
  saveButton: { marginTop: 8, borderRadius: 12 },
  saveContent: { paddingVertical: 6 },
});
