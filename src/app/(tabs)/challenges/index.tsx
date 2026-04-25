import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Trophy, Calendar } from 'lucide-react-native';
import { useQueries } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import { qk } from '@/api/queryClient';
import { useMyClubs } from '@/api/hooks';
import { formatMiles } from '@/utils/format';
import type { components } from '@/api/schema';

type Goal = components['schemas']['Goal'];
type GoalProgress = components['schemas']['GoalProgress'];
type Club = components['schemas']['Club'];

export default function ChallengesScreen() {
  const myClubsQ = useMyClubs();
  const clubs = (myClubsQ.data?.data ?? []) as Club[];

  // Fetch active goals for every club in parallel.
  const goalsQueries = useQueries({
    queries: clubs.map((c) => ({
      queryKey: qk.clubGoals(c.id, true),
      queryFn: () =>
        unwrap(
          api.GET('/v1/clubs/{clubId}/goals/active', { params: { path: { clubId: c.id } } }),
        ),
      enabled: !!c.id,
    })),
  });

  // Flatten all goals with their parent club, then fetch progress for each.
  const flattenedGoals = useMemo(() => {
    const acc: { club: Club; goal: Goal }[] = [];
    goalsQueries.forEach((q, idx) => {
      const club = clubs[idx];
      if (!club) return;
      (q.data?.data ?? []).forEach((goal) => acc.push({ club, goal }));
    });
    return acc;
  }, [goalsQueries, clubs]);

  const progressQueries = useQueries({
    queries: flattenedGoals.map(({ club, goal }) => ({
      queryKey: qk.goalProgress(club.id, goal.id),
      queryFn: () =>
        unwrap(
          api.GET('/v1/clubs/{clubId}/goals/{goalId}/progress', {
            params: { path: { clubId: club.id, goalId: goal.id } },
          }),
        ),
      enabled: !!goal.id,
    })),
  });

  const rows = flattenedGoals
    .map(({ club, goal }, i) => ({
      club,
      goal,
      progress: progressQueries[i]?.data as GoalProgress | undefined,
    }))
    .sort((a, b) => new Date(a.goal.end_date).getTime() - new Date(b.goal.end_date).getTime());

  const refreshing =
    myClubsQ.isFetching ||
    goalsQueries.some((q) => q.isFetching) ||
    progressQueries.some((q) => q.isFetching);

  const refetchAll = () => {
    void myClubsQ.refetch();
    goalsQueries.forEach((q) => void q.refetch());
    progressQueries.forEach((q) => void q.refetch());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>Active goals across your clubs</Text>
      </View>

      {myClubsQ.isLoading ? (
        <ActivityIndicator color="#00A3E0" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor="#00A3E0" />
          }
        >
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Trophy size={32} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No active challenges</Text>
              <Text style={styles.emptyBody}>
                Goals you create or join through your clubs will show up here.
              </Text>
            </View>
          ) : (
            rows.map((r) => (
              <ChallengeCard key={r.goal.id} club={r.club} goal={r.goal} progress={r.progress} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ChallengeCard({
  club,
  goal,
  progress,
}: {
  club: Club;
  goal: Goal;
  progress?: GoalProgress;
}) {
  const target = Number(progress?.target_distance_miles ?? goal.target_distance_miles ?? 0);
  const total = Number(progress?.total_distance_miles ?? 0);
  const pct = target ? Math.min(100, (total / target) * 100) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/(tabs)/clubs/${club.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clubName}>{club.name}</Text>
        <View style={styles.daysLeft}>
          <Calendar size={11} color="#FFD24A" />
          <Text style={styles.daysLeftText}>{daysLeft} days left</Text>
        </View>
      </View>
      <Text style={styles.goalName}>{goal.name}</Text>
      <Text style={styles.goalMeta}>
        {formatMiles(total)} / {formatMiles(target)}
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressPct}>{Math.round(pct)}% complete</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 140 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyBody: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clubName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  daysLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,210,74,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  daysLeftText: { color: '#FFD24A', fontSize: 11, fontWeight: '600' },
  goalName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  goalMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF6B35' },
  progressPct: { color: '#FF6B35', fontSize: 11, marginTop: 6, fontWeight: '600' },
});
