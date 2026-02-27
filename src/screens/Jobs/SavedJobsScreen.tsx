import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { JobCard } from '../../components/jobs/JobCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppTheme } from '../../config/themes';
import type { JobsScreenProps } from '../../types/navigation';
import type { SavedJob, JobListing } from '../../types/models';

export default function SavedJobsScreen({ navigation }: JobsScreenProps<'SavedJobs'>) {
  const theme = useAppTheme();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) setSavedJobs(data as SavedJob[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleUnsave = useCallback(async (savedJobId: string, externalJobId: string) => {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', savedJobId);

    if (!error) {
      setSavedJobs((prev) => prev.filter((s) => s.id !== savedJobId));
    }
  }, []);

  const renderItem = ({ item }: { item: SavedJob }) => {
    const job = item.job_data as JobListing | null;
    if (!job) return null;

    return (
      <JobCard
        job={job}
        isSaved={true}
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
        onSave={() => handleUnsave(item.id, job.id)}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!loading && savedJobs.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="No Saved Jobs"
          message="Jobs you bookmark will appear here"
        />
      ) : (
        <FlatList
          data={savedJobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            savedJobs.length > 0 ? (
              <Text variant="bodySmall" style={[styles.count, { color: theme.colors.textSecondary }]}>
                {savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  count: { marginBottom: 12 },
});
