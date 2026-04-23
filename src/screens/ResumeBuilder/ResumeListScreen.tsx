import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, FAB, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/date';
import { useAppTheme } from '../../config/themes';
import type { ResumeScreenProps } from '../../types/navigation';
import type { Resume } from '../../types/models';

export default function ResumeListScreen({ navigation }: ResumeScreenProps<'ResumesList'>) {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { resumes, loading, createResume, deleteResume } = useResume(user?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const resume = await createResume(newTitle.trim());
    setShowCreate(false);
    setNewTitle('');
    navigation.navigate('ResumeEditor', { resumeId: resume.id });
  };

  const handleDelete = (resume: Resume) => {
    Alert.alert('Delete Resume', `Delete "${resume.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteResume(resume.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Resume }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => navigation.navigate('ResumeEditor', { resumeId: item.id })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.textSecondary, marginTop: 2 }}>
              Updated {formatDate(item.updated_at)}
              {item.is_primary && ' \u2022 Primary'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            {item.last_ats_score != null && (
              <Text variant="labelMedium" style={[styles.atsScore, { color: theme.colors.primary }]}>
                ATS: {item.last_ats_score}%
              </Text>
            )}
            <IconButton icon="eye-outline" size={20} onPress={() => navigation.navigate('ResumePreview', { resumeId: item.id })} />
            <IconButton icon="delete-outline" size={20} onPress={() => handleDelete(item)} iconColor={theme.colors.error} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (!loading && resumes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="file-document-plus-outline"
          title="No Resumes Yet"
          message="Create your first resume to start applying for jobs"
          actionLabel="Create Resume"
          onAction={() => setShowCreate(true)}
        />
        <Portal>
          <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)}>
            <Dialog.Title>New Resume</Dialog.Title>
            <Dialog.Content>
              <TextInput label="Resume Title" value={newTitle} onChangeText={setNewTitle} mode="outlined" placeholder="e.g., Software Engineer Resume" />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowCreate(false)}>Cancel</Button>
              <Button onPress={handleCreate} disabled={!newTitle.trim()}>Create</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={resumes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Button
            mode="contained-tonal"
            icon="lightbulb-on"
            onPress={() => navigation.navigate('ResumeTips')}
            style={styles.tipsButton}
            contentStyle={styles.tipsButtonContent}
          >
            Get AI Tips to Improve Your Resume
          </Button>
        }
      />
      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color={theme.colors.onPrimary} onPress={() => setShowCreate(true)} />
      <Portal>
        <Dialog visible={showCreate} onDismiss={() => setShowCreate(false)}>
          <Dialog.Title>New Resume</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Resume Title" value={newTitle} onChangeText={setNewTitle} mode="outlined" placeholder="e.g., Software Engineer Resume" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreate(false)}>Cancel</Button>
            <Button onPress={handleCreate} disabled={!newTitle.trim()}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  atsScore: { fontWeight: '600', marginRight: 4 },
  tipsButton: { marginBottom: 16, borderRadius: 12 },
  tipsButtonContent: { paddingVertical: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
