import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, Portal, Dialog, ActivityIndicator } from 'react-native-paper';
import { useAppTheme } from '../../config/themes';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import { ExperienceForm } from '../../components/resume/ExperienceForm';
import { EducationForm } from '../../components/resume/EducationForm';
import { SkillsForm } from '../../components/resume/SkillsForm';
import { ProjectForm } from '../../components/resume/ProjectForm';
import { settingsStorage } from '../../services/storage/settings.storage';
import { ResumeImproverService } from '../../services/ai/resumeImprover.ai';
import type { ResumeScreenProps } from '../../types/navigation';
import type { Resume, ResumeContent, ResumeSection } from '../../types/models';

type EditingItem = { sectionIndex: number; itemIndex: number | null };

export default function ResumeEditorScreen({ route, navigation }: ResumeScreenProps<'ResumeEditor'>) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { resumes, updateResumeContent, updateResume } = useResume(user?.id);
  const resumeId = route.params?.resumeId;

  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [improving, setImproving] = useState<number | null>(null);

  useEffect(() => {
    const found = resumes.find((r) => r.id === resumeId);
    if (found) {
      setResume(found);
      setContent(found.content);
    }
  }, [resumes, resumeId]);

  if (!content || !resume) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" style={{ marginTop: 40 }} /></View>;
  }

  const saveContent = async (newContent: ResumeContent) => {
    setContent(newContent);
    await updateResumeContent(resume.id, newContent);
  };

  const updateSection = (sectionIndex: number, updatedSection: ResumeSection) => {
    const sections = [...content.sections];
    sections[sectionIndex] = updatedSection;
    saveContent({ ...content, sections });
  };

  const addItem = (sectionIndex: number, item: any) => {
    const section = content.sections[sectionIndex];
    updateSection(sectionIndex, { ...section, items: [...section.items, item] });
    setShowForm(false);
    setEditingItem(null);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, item: any) => {
    const section = content.sections[sectionIndex];
    const items = [...section.items];
    items[itemIndex] = item;
    updateSection(sectionIndex, { ...section, items });
    setShowForm(false);
    setEditingItem(null);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const section = content.sections[sectionIndex];
    const items = section.items.filter((_, i) => i !== itemIndex);
    updateSection(sectionIndex, { ...section, items });
  };

  const handleImproveSection = async (sectionIndex: number) => {
    const settings = await settingsStorage.get();
    if (!settings.groq_api_key) {
      Alert.alert('API Key Required', 'Please set your Groq API key in Settings.');
      return;
    }
    setImproving(sectionIndex);
    try {
      const section = content.sections[sectionIndex];
      const improved = await ResumeImproverService.improveSection(settings.groq_api_key, section);
      updateSection(sectionIndex, improved);
      Alert.alert('Improved!', 'Section has been optimized with AI.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setImproving(null);
    }
  };

  const renderFormForSection = (sectionIndex: number) => {
    const section = content.sections[sectionIndex];
    const existingItem = editingItem?.itemIndex != null ? section.items[editingItem.itemIndex] : undefined;

    const onSave = (item: any) => {
      if (editingItem?.itemIndex != null) {
        updateItem(sectionIndex, editingItem.itemIndex, item);
      } else {
        addItem(sectionIndex, item);
      }
    };
    const onCancel = () => { setShowForm(false); setEditingItem(null); };

    switch (section.type) {
      case 'experience': return <ExperienceForm item={existingItem as any} onSave={onSave} onCancel={onCancel} />;
      case 'education': return <EducationForm item={existingItem as any} onSave={onSave} onCancel={onCancel} />;
      case 'skills': return <SkillsForm item={existingItem as any} onSave={onSave} onCancel={onCancel} />;
      case 'projects': return <ProjectForm item={existingItem as any} onSave={onSave} onCancel={onCancel} />;
      default: return null;
    }
  };

  const renderSectionItems = (section: ResumeSection, sectionIndex: number) => {
    if (section.items.length === 0) {
      return <Text variant="bodySmall" style={{ color: theme.colors.textMuted, fontStyle: 'italic', paddingVertical: 8 }}>No items yet. Tap + to add.</Text>;
    }
    return section.items.map((item: any, itemIndex: number) => (
      <View key={item.id || itemIndex} style={[styles.item, { borderBottomColor: theme.colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={styles.itemTitle}>
            {item.title || item.category || 'Item'}
          </Text>
          {item.organization && (
            <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginTop: 2 }}>{item.organization}</Text>
          )}
          {item.skills && (
            <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginTop: 2 }}>{item.skills.join(', ')}</Text>
          )}
        </View>
        <IconButton icon="pencil-outline" size={18} onPress={() => { setEditingItem({ sectionIndex, itemIndex }); setShowForm(true); }} />
        <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => removeItem(sectionIndex, itemIndex)} />
      </View>
    ));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* Personal Info */}
      <Card style={styles.card}>
        <Card.Title title="Personal Information" />
        <Card.Content>
          <TextInput label="Full Name" value={content.personal_info.full_name} onChangeText={(v) => saveContent({ ...content, personal_info: { ...content.personal_info, full_name: v } })} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
          <TextInput label="Email" value={content.personal_info.email} onChangeText={(v) => saveContent({ ...content, personal_info: { ...content.personal_info, email: v } })} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
          <TextInput label="Phone" value={content.personal_info.phone || ''} onChangeText={(v) => saveContent({ ...content, personal_info: { ...content.personal_info, phone: v } })} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
          <TextInput label="Location" value={content.personal_info.location || ''} onChangeText={(v) => saveContent({ ...content, personal_info: { ...content.personal_info, location: v } })} mode="outlined" style={[styles.input, { backgroundColor: theme.colors.surface }]} />
        </Card.Content>
      </Card>

      {/* Summary */}
      <Card style={styles.card}>
        <Card.Title title="Professional Summary" />
        <Card.Content>
          <TextInput value={content.summary} onChangeText={(v) => saveContent({ ...content, summary: v })} mode="outlined" multiline numberOfLines={4} style={[styles.input, { backgroundColor: theme.colors.surface }]} />
        </Card.Content>
      </Card>

      {/* Sections */}
      {content.sections.map((section, sectionIndex) => (
        <Card key={section.type + sectionIndex} style={styles.card}>
          <Card.Title
            title={section.title}
            right={() => (
              <View style={styles.sectionActions}>
                <Button
                  mode="text"
                  icon="auto-fix"
                  compact
                  loading={improving === sectionIndex}
                  onPress={() => handleImproveSection(sectionIndex)}
                >
                  AI
                </Button>
                <IconButton
                  icon="plus"
                  size={20}
                  onPress={() => { setEditingItem({ sectionIndex, itemIndex: null }); setShowForm(true); }}
                />
              </View>
            )}
          />
          <Card.Content>
            {showForm && editingItem?.sectionIndex === sectionIndex
              ? renderFormForSection(sectionIndex)
              : renderSectionItems(section, sectionIndex)
            }
          </Card.Content>
        </Card>
      ))}

      <Button
        mode="contained"
        icon="eye"
        onPress={() => navigation.navigate('ResumePreview', { resumeId: resume.id })}
        style={styles.previewButton}
        contentStyle={styles.previewButtonContent}
      >
        Preview Resume
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, borderRadius: 12 },
  input: { marginBottom: 12 },
  sectionActions: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  itemTitle: { fontWeight: '500' },
  previewButton: { marginTop: 8, borderRadius: 12 },
  previewButtonContent: { paddingVertical: 6 },
});
