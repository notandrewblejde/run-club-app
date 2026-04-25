import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Users, Target, Trophy } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useClub,
  useClubGoals,
  useClubMembers,
  useGoalLeaderboard,
  useGoalProgress,
} from '@/api/hooks';
import { formatMiles } from '@/utils/format';
import type { components } from '@/api/schema';

type Goal = components['schemas']['Goal'];

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQ = useClub(id);
  const membersQ = useClubMembers(id);
  const goalsQ = useClubGoals(id, true);

  if (!id) return null;

  const club = clubQ.data;
  const members = membersQ.data?.data ?? [];
  const goals = goalsQ.data?.data ?? [];

  const refetch = () => {
    void clubQ.refetch();
    void membersQ.refetch();
    void goalsQ.refetch();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {club?.name ?? 'Club'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {clubQ.isLoading ? (
        <ActivityIndicator color="#00A3E0" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={clubQ.isFetching} onRefresh={refetch} tintColor="#00A3E0" />
          }
        >
          {club?.description ? <Text style={styles.description}>{club.description}</Text> : null}

          <Section icon={<Target size={16} color="#FF6B35" />} title="Goals">
            {goals.length === 0 ? (
              <Text style={styles.empty}>No active goals. An admin can create one.</Text>
            ) : (
              goals.map((g) => <GoalCard key={g.id} clubId={id} goal={g} />)
            )}
          </Section>

          <Section
            icon={<Users size={16} color="#00A3E0" />}
            title={`Members (${members.length})`}
          >
            {members.map((m) => (
              <View key={m.user?.id ?? m.club_id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {(m.user?.name ?? '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.user?.name ?? 'Unnamed'}</Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
              </View>
            ))}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function GoalCard({ clubId, goal }: { clubId: string; goal: Goal }) {
  const progressQ = useGoalProgress(clubId, goal.id);
  const lbQ = useGoalLeaderboard(clubId, goal.id);
  const target = Number(progressQ.data?.target_distance_miles ?? goal.target_distance_miles ?? 0);
  const total = Number(progressQ.data?.total_distance_miles ?? 0);
  const pct = target ? Math.min(100, (total / target) * 100) : 0;
  const top = lbQ.data?.data ?? [];

  return (
    <View style={styles.goalCard}>
      <Text style={styles.goalName}>{goal.name}</Text>
      <Text style={styles.goalMeta}>
        {formatMiles(total)} / {formatMiles(target)}
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressPct}>{Math.round(pct)}% complete</Text>

      {top.length > 0 ? (
        <View style={styles.leaderboard}>
          <View style={styles.leaderboardHeader}>
            <Trophy size={12} color="#FFD24A" />
            <Text style={styles.leaderboardTitle}>Top contributors</Text>
          </View>
          {top.slice(0, 5).map((e) => (
            <View key={e.user?.id ?? e.rank} style={styles.leaderboardRow}>
              <Text style={styles.leaderboardRank}>{e.rank}.</Text>
              <Text style={styles.leaderboardName}>{e.user?.name ?? 'Unnamed'}</Text>
              <Text style={styles.leaderboardMiles}>
                {formatMiles(Number(e.total_distance_miles))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontWeight: '600', fontSize: 16 },
  body: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 140 },
  description: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  goalCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  goalName: { color: '#fff', fontWeight: '600', marginBottom: 4 },
  goalMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF6B35' },
  progressPct: { color: '#FF6B35', fontSize: 11, marginTop: 6, fontWeight: '600' },
  leaderboard: { marginTop: 12, gap: 4 },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  leaderboardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  leaderboardRank: { color: 'rgba(255,255,255,0.4)', fontSize: 12, width: 20 },
  leaderboardName: { color: '#fff', fontSize: 13, flex: 1 },
  leaderboardMiles: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00A3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { color: '#0F0F0F', fontWeight: '700' },
  memberName: { color: '#fff', fontSize: 14 },
  memberRole: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
