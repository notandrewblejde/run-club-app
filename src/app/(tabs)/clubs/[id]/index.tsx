import { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Users, Target, Trophy } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useClub,
  useClubGoals,
  useClubMembers,
  useGoalLeaderboard,
  useGoalProgress,
} from '@/api/hooks';
import { formatMiles } from '@/utils/format';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Goal = components['schemas']['Goal'];

export default function ClubDetailScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQ = useClub(id);
  const membersQ = useClubMembers(id);
  const goalsQ = useClubGoals(id, true);
  const { setActions, clearActions } = useBottomBarActions();

  const club = clubQ.data;
  const members = membersQ.data?.data ?? [];
  const goals = goalsQ.data?.data ?? [];
  const canManage = club?.viewer_role === 'owner' || club?.viewer_role === 'admin';

  const refetch = () => {
    void clubQ.refetch();
    void membersQ.refetch();
    void goalsQ.refetch();
  };

  useEffect(() => {
    if (canManage && id) {
      setActions([
        {
          label: 'Add goal',
          onPress: () => router.push(`/(tabs)/clubs/${id}/goals/new`),
        },
      ]);
    } else {
      clearActions();
    }
    return () => clearActions();
  }, [canManage, id, setActions, clearActions]);

  if (!id) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {club?.name ?? 'Club'}
        </Text>
      </View>

      {clubQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={clubQ.isFetching}
              onRefresh={refetch}
              tintColor={tokens.accentBlue}
            />
          }
        >
          {club?.description ? <Text style={styles.description}>{club.description}</Text> : null}

          <Section
            icon={<Target size={16} color={tokens.accentOrange} />}
            title="Goals"
            styles={styles}
          >
            {goals.length === 0 ? (
              <Text style={styles.empty}>
                {canManage
                  ? 'No active goals yet. Tap "Add goal" below to create one.'
                  : 'No active goals. An admin can create one.'}
              </Text>
            ) : (
              goals.map((g) => <GoalCard key={g.id} clubId={id} goal={g} tokens={tokens} styles={styles} />)
            )}
          </Section>

          <Section
            icon={<Users size={16} color={tokens.accentBlue} />}
            title={`Members (${members.length})`}
            styles={styles}
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
  styles,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
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

function GoalCard({
  clubId,
  goal,
  tokens,
  styles,
}: {
  clubId: string;
  goal: Goal;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
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
            <Trophy size={12} color={tokens.accentYellow} />
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

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
    },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22 },
    body: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 140 },
    description: { color: t.textSecondary, fontSize: 14, marginBottom: 20 },
    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionTitle: { color: t.text, fontSize: 15, fontWeight: '600' },
    empty: { color: t.textMuted, fontSize: 13 },
    goalCard: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    goalName: { color: t.text, fontWeight: '600', marginBottom: 4 },
    goalMeta: { color: t.textSecondary, fontSize: 13, marginBottom: 8 },
    progressBar: {
      height: 6,
      backgroundColor: t.surfaceElevated,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: t.accentOrange },
    progressPct: { color: t.accentOrange, fontSize: 11, marginTop: 6, fontWeight: '600' },
    leaderboard: { marginTop: 12, gap: 4 },
    leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    leaderboardTitle: { color: t.textSecondary, fontSize: 12, fontWeight: '600' },
    leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    leaderboardRank: { color: t.textMuted, fontSize: 12, width: 20 },
    leaderboardName: { color: t.text, fontSize: 13, flex: 1 },
    leaderboardMiles: { color: t.textSecondary, fontSize: 12 },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberInitial: { color: '#fff', fontWeight: '700' },
    memberName: { color: t.text, fontSize: 14 },
    memberRole: { color: t.textMuted, fontSize: 12 },
  });
}
