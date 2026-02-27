import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, SectionList, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Searchbar, Chip, IconButton, Text, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { JobCard } from '../../components/jobs/JobCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { JobListSkeleton } from '../../components/ui/SkeletonLoader';
import { FilterBottomSheet } from '../../components/jobs/FilterBottomSheet';
import { JOB_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../config/constants';
import { LOCALITY_COLORS } from '../../services/jobs/matchScoring';
import { useAppTheme } from '../../config/themes';
import type { JobsScreenProps } from '../../types/navigation';
import type { JobListing, JobType, ExperienceLevel, JobLocality } from '../../types/models';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const JOB_TYPE_FILTERS: (JobType | 'all')[] = ['all', 'full_time', 'remote', 'contract', 'internship'];

type ViewMode = 'all' | 'local' | 'global';

const SECTION_CONFIG: Record<JobLocality, { title: string; icon: string }> = {
  city: { title: 'In Your City', icon: 'map-marker-radius' },
  national: { title: 'In Your Country', icon: 'flag' },
  remote: { title: 'Remote / Global', icon: 'wifi' },
  international: { title: 'International', icon: 'earth' },
  unknown: { title: 'Other', icon: 'briefcase-outline' },
};

const LOCALITY_ORDER: JobLocality[] = ['city', 'national', 'remote', 'unknown', 'international'];

export default function JobsListScreen({ navigation }: JobsScreenProps<'JobsList'>) {
  const theme = useAppTheme();
  const { profile } = useAuth();
  const { jobs, loading, refreshing, error, refreshJobs, searchJobs, isJobSaved, saveJob, unsaveJob, getMatchForJob } = useJobs();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<JobType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [snackVisible, setSnackVisible] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState<ExperienceLevel | null>(null);
  const [isRemoteFilter, setIsRemoteFilter] = useState<boolean | undefined>(undefined);
  const [salaryMinFilter, setSalaryMinFilter] = useState<number | null>(null);
  const [salaryMaxFilter, setSalaryMaxFilter] = useState<number | null>(null);

  const hasAdvancedFilters = !!locationFilter || !!experienceFilter || isRemoteFilter !== undefined || salaryMinFilter != null || salaryMaxFilter != null;

  const filteredJobs = searchJobs({
    query: query || undefined,
    job_type: activeFilter !== 'all' ? activeFilter : undefined,
    location: locationFilter || undefined,
    experience_level: experienceFilter || undefined,
    is_remote: isRemoteFilter,
    salary_min: salaryMinFilter ?? undefined,
    salary_max: salaryMaxFilter ?? undefined,
  });

  const sections = useMemo(() => {
    const LOCAL_TIERS = new Set<JobLocality>(['city', 'national', 'remote']);
    const GLOBAL_TIERS = new Set<JobLocality>(['international', 'unknown']);

    const groups: Record<JobLocality, JobListing[]> = {
      city: [], national: [], remote: [], unknown: [], international: [],
    };

    for (const job of filteredJobs) {
      const match = getMatchForJob(job.id);
      const locality = match?.locality || 'unknown';

      if (viewMode === 'local' && !LOCAL_TIERS.has(locality)) continue;
      if (viewMode === 'global' && !GLOBAL_TIERS.has(locality)) continue;

      groups[locality].push(job);
    }

    return LOCALITY_ORDER
      .filter((loc) => groups[loc].length > 0)
      .map((loc) => ({
        locality: loc,
        title: SECTION_CONFIG[loc].title,
        icon: SECTION_CONFIG[loc].icon,
        data: groups[loc],
      }));
  }, [filteredJobs, getMatchForJob, viewMode]);

  const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);
  const hasLocalJobs = sections.some((s) => s.locality === 'city' || s.locality === 'national');
  const showNoLocalBanner = viewMode === 'local' && !hasLocalJobs && totalCount > 0;

  const handleRefresh = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await refreshJobs();
    if (error) setSnackVisible(true);
  }, [refreshJobs, error]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  }, []);

  const renderItem = ({ item }: { item: JobListing }) => (
    <JobCard
      job={item}
      match={getMatchForJob(item.id)}
      isSaved={isJobSaved(item.id)}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
      onSave={() => isJobSaved(item.id) ? unsaveJob(item.id) : saveJob(item)}
    />
  );

  const renderSectionHeader = ({ section }: { section: { locality: JobLocality; title: string; icon: string; data: JobListing[] } }) => {
    const colors = LOCALITY_COLORS[section.locality];
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.bg }]}>
            <MaterialCommunityIcons name={section.icon as any} size={16} color={colors.text} />
          </View>
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {section.title}
          </Text>
        </View>
        <View style={[styles.sectionCountBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.sectionCountText, { color: colors.text }]}>{section.data.length}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search jobs..."
            value={query}
            onChangeText={setQuery}
            style={[styles.searchbar, { backgroundColor: theme.colors.inputBackground }]}
            inputStyle={styles.searchInput}
          />
          <IconButton
            icon="tune"
            size={24}
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterButton,
              hasAdvancedFilters && { backgroundColor: theme.colors.primaryContainer },
            ]}
          />
        </View>

        <View style={styles.viewToggle}>
          {(['all', 'local', 'global'] as ViewMode[]).map((mode) => (
            <Chip
              key={mode}
              selected={viewMode === mode}
              onPress={() => handleViewModeChange(mode)}
              compact
              style={[
                styles.viewChip,
                { backgroundColor: theme.colors.inputBackground },
                viewMode === mode && { backgroundColor: theme.colors.primary },
              ]}
              textStyle={[
                styles.viewChipText,
                viewMode === mode && { color: theme.colors.onPrimary },
              ]}
            >
              {mode === 'all' ? 'All' : mode === 'local' ? 'Local + Remote' : 'Global'}
            </Chip>
          ))}
        </View>

        <View style={styles.filters}>
          {JOB_TYPE_FILTERS.map((type) => (
            <Chip
              key={type}
              selected={activeFilter === type}
              onPress={() => setActiveFilter(type)}
              compact
              style={[
                styles.filterChip,
                activeFilter === type && { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              {type === 'all' ? 'All Types' : JOB_TYPE_LABELS[type] || type}
            </Chip>
          ))}
        </View>

        {hasAdvancedFilters && (
          <View style={styles.activeFilters}>
            {locationFilter ? (
              <Chip compact icon="map-marker" onClose={() => setLocationFilter('')} style={[styles.activeChip, { backgroundColor: theme.colors.outlineVariant }]} textStyle={styles.activeChipText}>
                {locationFilter}
              </Chip>
            ) : null}
            {experienceFilter ? (
              <Chip compact icon="account-tie" onClose={() => setExperienceFilter(null)} style={[styles.activeChip, { backgroundColor: theme.colors.outlineVariant }]} textStyle={styles.activeChipText}>
                {EXPERIENCE_LEVEL_LABELS[experienceFilter]}
              </Chip>
            ) : null}
            {isRemoteFilter !== undefined ? (
              <Chip compact icon={isRemoteFilter ? 'wifi' : 'office-building-outline'} onClose={() => setIsRemoteFilter(undefined)} style={[styles.activeChip, { backgroundColor: theme.colors.outlineVariant }]} textStyle={styles.activeChipText}>
                {isRemoteFilter ? 'Remote' : 'On-site'}
              </Chip>
            ) : null}
            {(salaryMinFilter != null || salaryMaxFilter != null) ? (
              <Chip compact icon="currency-usd" onClose={() => { setSalaryMinFilter(null); setSalaryMaxFilter(null); }} style={[styles.activeChip, { backgroundColor: theme.colors.outlineVariant }]} textStyle={styles.activeChipText}>
                {salaryMinFilter != null ? `$${Math.round(salaryMinFilter / 1000)}k` : '$0'}
                {' – '}
                {salaryMaxFilter != null ? `$${Math.round(salaryMaxFilter / 1000)}k` : 'Any'}
              </Chip>
            ) : null}
          </View>
        )}
      </View>

      {(loading || refreshing) && jobs.length === 0 ? (
        <JobListSkeleton count={4} />
      ) : totalCount === 0 && !refreshing ? (
        <EmptyState
          icon="briefcase-search-outline"
          title="No Jobs Found"
          message={jobs.length === 0 ? 'Pull down to refresh or tap the button below' : viewMode !== 'all' ? 'Try switching to "All" view' : 'Try a different search or filter'}
          actionLabel="Refresh Jobs"
          onAction={handleRefresh}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <View>
              <Text variant="bodySmall" style={[styles.count, { color: theme.colors.textSecondary }]}>
                {totalCount} jobs found{viewMode !== 'all' ? ` (${viewMode} view)` : ''}
              </Text>
              {showNoLocalBanner && (
                <View style={[styles.noLocalBanner, { backgroundColor: theme.colors.warningContainer }]}>
                  <MaterialCommunityIcons name="map-marker-off-outline" size={16} color={theme.colors.warning} />
                  <Text style={[styles.noLocalText, { color: theme.colors.warning }]} numberOfLines={2}>
                    No jobs found in your city/country — showing remote matches instead
                  </Text>
                </View>
              )}
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      <Snackbar
        visible={snackVisible && !!error}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        action={{ label: 'Retry', onPress: handleRefresh }}
      >
        {error}
      </Snackbar>

      <FilterBottomSheet
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        filters={{
          location: locationFilter,
          experienceLevel: experienceFilter,
          isRemote: isRemoteFilter,
          salaryMin: salaryMinFilter,
          salaryMax: salaryMaxFilter,
        }}
        onApply={(f) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setLocationFilter(f.location);
          setExperienceFilter(f.experienceLevel);
          setIsRemoteFilter(f.isRemote);
          setSalaryMinFilter(f.salaryMin);
          setSalaryMaxFilter(f.salaryMax);
        }}
        suggestedLocations={profile?.desired_locations || []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, elevation: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  searchbar: { flex: 1, borderRadius: 12, elevation: 0 },
  searchInput: { fontSize: 14 },
  filterButton: { marginTop: 0 },
  viewToggle: { flexDirection: 'row', gap: 6, marginTop: 10 },
  viewChip: { flexShrink: 1 },
  viewChipText: { fontSize: 12, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  filterChip: { flexShrink: 1 },
  activeFilters: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  activeChip: { flexShrink: 1 },
  activeChipText: { fontSize: 11 },
  list: { padding: 16, paddingBottom: 32 },
  count: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10, paddingVertical: 4 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontWeight: '700', fontSize: 14 },
  sectionCountBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 28, alignItems: 'center' },
  sectionCountText: { fontSize: 12, fontWeight: '700' },
  noLocalBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 2 },
  noLocalText: { flex: 1, fontSize: 12, fontWeight: '500' },
});
