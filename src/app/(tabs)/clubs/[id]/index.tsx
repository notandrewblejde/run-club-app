import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Target, Trophy, Newspaper, Pencil, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useClub,
  useClubFeed,
  useClubGoals,
  useClubMembers,
  useDeleteGoal,
  useGoalLeaderboard,
  useGoalProgress,
} from '@/api/hooks';
import { formatRelativeFromUnix } from '@/utils/format';
import { formatMiles } from '@/utils/format';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Goal = components['schemas']['Goal'];
type ClubHomeTab = 'activity' | 'leaderboard' | 'members';

export default function ClubDetailScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQ = useClub(id);
  const membersQ = useClubMembers(id);
  const goalsQ = useClubGoals(id, true);
  const { setActions, clearActions } = useBottomBarActions();
  const [homeTab, setHomeTab] = useState<ClubHomeTab>('activity');

  const feedQ = useClubFeed(id);
  const club = clubQ.data;
  const members = membersQ.data?.data ?? [];
  const goals = goalsQ.data?.data ?? [];
  const recentFeed = (feedQ.data?.feed ?? []).slice(0, 20);
  const canManage = club?.viewer_role === 'owner' || club?.viewer_role === 'admin';

  const refetch = () => {
    void clubQ.refetch();
    void membersQ.refetch();
    void goalsQ.refetch();
    void feedQ.refetch();
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
              goals.map((g) => (
                <GoalCard
                  key={g.id}
                  clubId={id}
                  goal={g}
                  canManage={canManage}
                  tokens={tokens}
                  styles={styles}
                />
              ))
            )}
          </Section>

          <ClubHomePills
            active={homeTab}
            onChange={setHomeTab}
            memberCount={members.length}
            tokens={tokens}
            styles={styles}
          />

          {homeTab === 'activity' ? (
            <Section
              icon={<Newspaper size={16} color={tokens.accentBlue} />}
              title="Recent activity"
              styles={styles}
            >
              {recentFeed.length === 0 ? (
                <Text style={styles.empty}>No activity yet.</Text>
              ) : (
                recentFeed.map((item) => {
                  const feedItemId = String(item.id ?? '');
                  const type = String(item.type ?? '');
                  const authorName = String(
                    item.author_name ?? item.athlete_name ?? 'Someone',
                  );
                  const created = item.created_at as string | undefined;
                  const summary =
                    type === 'post'
                      ? String(item.content ?? '')
                      : `${authorName} logged ${item.name ?? 'a run'}`;
                  return (
                    <View key={`${type}-${feedItemId}`} style={styles.feedRow}>
                      <View style={styles.feedDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feedAuthor}>{authorName}</Text>
                        <Text style={styles.feedSummary} numberOfLines={2}>
                          {summary}
                        </Text>
                        {created ? (
                          <Text style={styles.feedTimestamp}>
                            {formatRelativeFromUnix(
                              typeof created === 'string'
                                ? Math.floor(new Date(created).getTime() / 1000)
                                : created,
                            )}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </Section>
          ) : null}

          {homeTab === 'leaderboard' ? (
            <View style={styles.tabPanel}>
              {goals.length === 0 ? (
                <Text style={styles.empty}>No active goals yet — nothing to rank.</Text>
              ) : (
                goals.map((g) => (
                  <GoalLeaderboardPanel
                    key={g.id}
                    clubId={id}
                    goal={g}
                    tokens={tokens}
                    styles={styles}
                  />
                ))
              )}
            </View>
          ) : null}

          {homeTab === 'members' ? (
            <MembersHomeTab
              clubId={id}
              members={members}
              canManage={canManage}
              tokens={tokens}
              styles={styles}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function ClubHomePills({
  active,
  onChange,
  memberCount,
  tokens,
  styles,
}: {
  active: ClubHomeTab;
  onChange: (t: ClubHomeTab) => void;
  memberCount: number;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  const items: { key: ClubHomeTab; label: string }[] = [
    { key: 'activity', label: 'Activity' },
    { key: 'leaderboard', label: 'Leaderboard' },
    {
      key: 'members',
      label: memberCount > 0 ? `Members (${memberCount})` : 'Members',
    },
  ];
  return (
    <View style={styles.pillRow}>
      {items.map(({ key, label }) => {
        const isOn = active === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={[
              styles.pill,
              { borderColor: tokens.navPillBorder, backgroundColor: tokens.navPill },
              isOn && {
                backgroundColor: tokens.accentBlue,
                borderColor: tokens.accentBlue,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.pillLabel, { color: tokens.textSecondary }, isOn && { color: '#fff' }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function GoalLeaderboardPanel({
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
  const lbQ = useGoalLeaderboard(clubId, goal.id);
  const top = lbQ.data?.data ?? [];

  return (
    <View style={styles.lbGoalBlock}>
      <View style={styles.lbGoalHeader}>
        <Trophy size={14} color={tokens.accentYellow} />
        <Text style={styles.lbGoalTitle} numberOfLines={2}>
          {goal.name}
        </Text>
      </View>
      {lbQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginVertical: 12 }} />
      ) : top.length === 0 ? (
        <Text style={styles.empty}>No contributions yet.</Text>
      ) : (
        top.map((e) => (
          <View key={e.user?.id ?? String(e.rank)} style={styles.leaderboardRow}>
            <Text style={styles.leaderboardRank}>{e.rank}.</Text>
            <Text style={styles.leaderboardName}>{e.user?.name ?? 'Unnamed'}</Text>
            <Text style={styles.leaderboardMiles}>
              {formatMiles(Number(e.total_distance_miles))}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

type ClubMemberRow = components['schemas']['ClubMembership'];

function MembersHomeTab({
  clubId,
  members,
  canManage,
  tokens,
  styles,
}: {
  clubId: string;
  members: ClubMemberRow[];
  canManage: boolean;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (members.length === 0) {
    return (
      <View style={styles.tabPanel}>
        <Text style={styles.empty}>No members yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabPanel}>
      {members.map((m) => {
        const uid = m.user?.id;
        return (
          <TouchableOpacity
            key={uid ?? m.club_id}
            style={styles.memberHomeRow}
            activeOpacity={uid ? 0.85 : 1}
            onPress={() => {
              if (uid) router.push(`/(tabs)/users/${uid}`);
            }}
          >
            {m.user?.avatar_url ? (
              <Image source={{ uri: m.user.avatar_url }} style={styles.memberHomeAvatar} />
            ) : (
              <View style={[styles.memberHomeAvatar, styles.memberHomeAvatarFallback]}>
                <Text style={styles.memberInitial}>
                  {(m.user?.name ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.user?.name ?? 'Unnamed'}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      {canManage ? (
        <TouchableOpacity
          style={styles.manageMembersLink}
          activeOpacity={0.85}
          onPress={() => router.push(`/(tabs)/clubs/${clubId}/members`)}
        >
          <Text style={[styles.manageMembersText, { color: tokens.accentBlue }]}>
            Manage roles & invites
          </Text>
        </TouchableOpacity>
      ) : null}
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
  canManage,
  tokens,
  styles,
}: {
  clubId: string;
  goal: Goal;
  canManage: boolean;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  const progressQ = useGoalProgress(clubId, goal.id);
  const lbQ = useGoalLeaderboard(clubId, goal.id);
  const deleteGoal = useDeleteGoal(clubId);
  const target = Number(progressQ.data?.target_distance_miles ?? goal.target_distance_miles ?? 0);
  const total = Number(progressQ.data?.total_distance_miles ?? 0);
  const pct = target ? Math.min(100, (total / target) * 100) : 0;
  const top = lbQ.data?.data ?? [];

  const confirmDelete = () => {
    Alert.alert(
      'Delete goal',
      `Remove “${goal.name}”? Progress and contributions for this goal will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteGoal.mutateAsync(goal.id);
              } catch (e: unknown) {
                Alert.alert('Could not delete goal', (e as Error)?.message ?? 'Try again later');
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalTitleRow}>
        <Text style={[styles.goalName, { flex: 1 }]} numberOfLines={2}>
          {goal.name}
        </Text>
        {canManage ? (
          <View style={styles.goalActions}>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/clubs/${clubId}/goals/${goal.id}/edit`)}
              hitSlop={8}
              accessibilityLabel="Edit goal"
            >
              <Pencil size={18} color={tokens.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDelete}
              hitSlop={8}
              disabled={deleteGoal.isPending}
              accessibilityLabel="Delete goal"
            >
              <Trash2 size={18} color={tokens.error} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
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
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      marginTop: 4,
    },
    pill: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillLabel: { fontSize: 12, fontWeight: '600' },
    tabPanel: { marginBottom: 8 },
    lbGoalBlock: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    lbGoalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    lbGoalTitle: { color: t.text, fontSize: 15, fontWeight: '600', flex: 1 },
    memberHomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
    },
    memberHomeAvatar: { width: 40, height: 40, borderRadius: 20 },
    memberHomeAvatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manageMembersLink: { paddingVertical: 14, alignItems: 'center' },
    manageMembersText: { fontSize: 14, fontWeight: '600' },
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
    goalTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    goalActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    goalName: { color: t.text, fontWeight: '600' },
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
    memberInitial: { color: '#fff', fontWeight: '700', fontSize: 11 },
    memberName: { color: t.text, fontSize: 14 },
    memberRole: { color: t.textMuted, fontSize: 12 },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
    },
    feedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.accentBlue,
      marginTop: 7,
    },
    feedAuthor: { color: t.text, fontWeight: '600', fontSize: 13 },
    feedSummary: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    feedTimestamp: { color: t.textMuted, fontSize: 11, marginTop: 4 },
  });
}
