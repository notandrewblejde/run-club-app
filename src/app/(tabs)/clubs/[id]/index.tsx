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
import {
  Target,
  Trophy,
  Newspaper,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useClub,
  useClubFeed,
  useClubGoals,
  useClubMembers,
  useClubLeaderboard,
  useDeleteGoal,
  useGoalLeaderboard,
  useGoalProgress,
  useMe,
  type ClubLeaderboardQuery,
} from '@/api/hooks';
import { formatRelativeFromUnix, formatMiles, formatDuration } from '@/utils/format';
import { generateStaticMapUrl } from '@/utils/mapbox';
import {
  useBottomBarActions,
  type BottomBarAction,
} from '@/components/nav/BottomBarActionsContext';
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
  const [lbMode, setLbMode] = useState<'30d' | '90d' | 'goal'>('30d');
  const [lbGoalId, setLbGoalId] = useState<string | undefined>(undefined);

  const feedQ = useClubFeed(id);
  const meQ = useMe();
  const allGoalsQ = useClubGoals(id, false);
  const club = clubQ.data;
  const members = membersQ.data?.data ?? [];
  const goals = goalsQ.data?.data ?? [];
  const allGoals = allGoalsQ.data?.data ?? [];
  const recentFeed = (feedQ.data?.feed ?? []).slice(0, 20);
  const canManage = club?.viewer_role === 'owner' || club?.viewer_role === 'admin';
  const myUserId = meQ.data?.id;

  const lbSpec = useMemo((): ClubLeaderboardQuery | null => {
    if (lbMode === '30d') return { window: '30d' };
    if (lbMode === '90d') return { window: '90d' };
    if (lbMode === 'goal' && lbGoalId) return { goalId: lbGoalId };
    return null;
  }, [lbMode, lbGoalId]);

  const clubLbQ = useClubLeaderboard(id, homeTab === 'leaderboard' ? lbSpec : null, {
    enabled: homeTab === 'leaderboard' && !!lbSpec,
  });

  /** Club-wide miles toward the selected goal — denominator for “share of completed” on the Goal leaderboard. */
  const goalProgressForLb = useGoalProgress(
    id ?? '',
    homeTab === 'leaderboard' && lbMode === 'goal' ? lbGoalId : undefined,
  );
  const goalCompletedMiles = Number(goalProgressForLb.data?.total_distance_miles ?? 0);

  useEffect(() => {
    if (lbMode !== 'goal' || allGoals.length === 0) return;
    setLbGoalId((prev) => (prev && allGoals.some((g) => g.id === prev) ? prev : allGoals[0].id));
  }, [lbMode, allGoals]);

  const refetch = () => {
    void clubQ.refetch();
    void membersQ.refetch();
    void goalsQ.refetch();
    void allGoalsQ.refetch();
    void feedQ.refetch();
    void clubLbQ.refetch();
  };

  useEffect(() => {
    if (!id || !club?.viewer_role) {
      clearActions();
      return () => clearActions();
    }
    const next: BottomBarAction[] = [
      {
        label: '+ Post',
        variant: 'outlined',
        icon: 'plus',
        onPress: () => router.push(`/(tabs)/clubs/${id}/posts/new`),
      },
    ];
    if (canManage) {
      next.push({
        label: 'Edit club',
        variant: 'outlined',
        icon: 'pencil',
        onPress: () => router.push(`/(tabs)/clubs/${id}/edit`),
      });
    }
    setActions(next);
    return () => clearActions();
  }, [canManage, id, club?.viewer_role, setActions, clearActions]);

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
                  ? 'No active goals yet. Use Add goal to create one.'
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
            {canManage ? (
              <TouchableOpacity
                style={[styles.goalAddRow, { backgroundColor: tokens.primary }]}
                onPress={() => router.push(`/(tabs)/clubs/${id}/goals/new`)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add goal"
              >
                <Plus size={20} color={tokens.onPrimary} strokeWidth={2.2} />
                <Text style={[styles.goalAddRowText, { color: tokens.onPrimary }]}>Add goal</Text>
                <ChevronRight size={18} color={tokens.onPrimary} style={{ opacity: 0.85 }} />
              </TouchableOpacity>
            ) : null}
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
                  const created = item.created_at as string | number | undefined;
                  const createdEpoch =
                    typeof created === 'string'
                      ? Math.floor(new Date(created).getTime() / 1000)
                      : typeof created === 'number'
                        ? created
                        : undefined;

                  if (item.type === 'activity') {
                    const authorName = String(item.athlete_name ?? 'Someone');
                    const poly =
                      typeof item.map_polyline === 'string' && item.map_polyline.length > 0
                        ? item.map_polyline
                        : null;
                    const rawMoving = item.moving_time_secs;
                    const movingSecs =
                      typeof rawMoving === 'number'
                        ? rawMoving
                        : typeof rawMoving === 'string'
                          ? parseInt(rawMoving, 10)
                          : NaN;
                    const rawDist = item.distance_miles;
                    const distNum =
                      typeof rawDist === 'number'
                        ? rawDist
                        : typeof rawDist === 'string'
                          ? parseFloat(rawDist)
                          : NaN;
                    const activityTitle = String(item.name ?? 'Run');
                    const mapUrl = generateStaticMapUrl(poly, 160, 160, {
                      style: tokens.mapStyle,
                      pathColor: tokens.mapPathColor,
                    });
                    const distLabel =
                      Number.isFinite(distNum) && distNum > 0 ? formatMiles(distNum) : null;
                    const timeLabel =
                      Number.isFinite(movingSecs) && movingSecs > 0
                        ? formatDuration(movingSecs)
                        : null;
                    const statsLine = [distLabel, timeLabel].filter(Boolean).join(' · ');

                    return (
                      <View key={`activity-${feedItemId}`} style={styles.feedRow}>
                        <View style={styles.feedDot} />
                        <TouchableOpacity
                          style={styles.feedActivityMain}
                          onPress={() =>
                            router.push(`/(tabs)/activity/${feedItemId}`, { withAnchor: true })
                          }
                          activeOpacity={0.88}
                          accessibilityRole="button"
                          accessibilityLabel={`Open activity ${activityTitle}`}
                        >
                          <View style={styles.feedActivityBody}>
                            <View style={styles.feedTopRow}>
                              <Text style={styles.feedAuthor}>{authorName}</Text>
                            </View>
                            <Text style={styles.feedActivityTitle} numberOfLines={2}>
                              {activityTitle}
                            </Text>
                            {statsLine ? (
                              <Text style={styles.feedActivityStats}>{statsLine}</Text>
                            ) : null}
                            {createdEpoch != null && !Number.isNaN(createdEpoch) ? (
                              <Text style={styles.feedTimestamp}>
                                {formatRelativeFromUnix(createdEpoch)}
                              </Text>
                            ) : null}
                          </View>
                          {mapUrl ? (
                            <Image
                              source={{ uri: mapUrl }}
                              style={styles.feedActivityMap}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.feedActivityMap, styles.feedActivityMapPlaceholder]}>
                              <Text style={styles.feedActivityMapPhText}>No route</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  const authorName = String(item.author_name ?? 'Someone');
                  const authorId = String(item.author_id ?? '');
                  const isEditablePost = !!authorId && authorId === myUserId;

                  const summary = String(item.content ?? '');
                  const relatedIdRaw = item.related_activity_id;
                  const relatedId =
                    relatedIdRaw != null && String(relatedIdRaw).length > 0
                      ? String(relatedIdRaw)
                      : null;
                  const relatedPoly =
                    typeof item.related_activity_map_polyline === 'string' &&
                    item.related_activity_map_polyline.length > 0
                      ? item.related_activity_map_polyline
                      : null;
                  const rawRelatedMoving = item.related_activity_moving_time_secs;
                  const relatedMovingSecs =
                    typeof rawRelatedMoving === 'number'
                      ? rawRelatedMoving
                      : typeof rawRelatedMoving === 'string'
                        ? parseInt(rawRelatedMoving, 10)
                        : NaN;
                  const rawRelatedDist = item.related_activity_distance_miles;
                  const relatedDistNum =
                    typeof rawRelatedDist === 'number'
                      ? rawRelatedDist
                      : typeof rawRelatedDist === 'string'
                        ? parseFloat(rawRelatedDist)
                        : NaN;
                  const hasLinkedRunData =
                    relatedId != null &&
                    (relatedPoly != null ||
                      (Number.isFinite(relatedDistNum) && relatedDistNum > 0) ||
                      (Number.isFinite(relatedMovingSecs) && relatedMovingSecs > 0));
                  const relatedTitle = String(item.related_activity_name ?? 'Run');
                  const relatedMapUrl = hasLinkedRunData
                    ? generateStaticMapUrl(relatedPoly, 160, 160, {
                        style: tokens.mapStyle,
                        pathColor: tokens.mapPathColor,
                      })
                    : null;
                  const relatedDistLabel =
                    Number.isFinite(relatedDistNum) && relatedDistNum > 0
                      ? formatMiles(relatedDistNum)
                      : null;
                  const relatedTimeLabel =
                    Number.isFinite(relatedMovingSecs) && relatedMovingSecs > 0
                      ? formatDuration(relatedMovingSecs)
                      : null;
                  const relatedStatsLine = [relatedDistLabel, relatedTimeLabel]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <View key={`post-${feedItemId}`} style={styles.feedRow}>
                      <View style={styles.feedDot} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.feedTopRow}>
                          <Text style={styles.feedAuthor}>{authorName}</Text>
                          {hasLinkedRunData && relatedId ? (
                            <TouchableOpacity
                              onPress={() =>
                                router.push(
                                  `/(tabs)/clubs/${id}/posts/${feedItemId}/edit`,
                                  { withAnchor: true },
                                )
                              }
                              hitSlop={10}
                              accessibilityRole="button"
                              accessibilityLabel="Open club post"
                            >
                              <ChevronRight size={22} color={tokens.textSecondary} />
                            </TouchableOpacity>
                          ) : isEditablePost ? (
                            <TouchableOpacity
                              onPress={() =>
                                router.push(`/(tabs)/clubs/${id}/posts/${feedItemId}/edit`)
                              }
                              hitSlop={8}
                            >
                              <Text style={[styles.feedEditLabel, { color: tokens.accentBlue }]}>
                                Edit
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        {hasLinkedRunData && relatedId ? (
                          <TouchableOpacity
                            style={styles.feedActivityMain}
                            onPress={() =>
                              router.push(`/(tabs)/activity/${relatedId}`, { withAnchor: true })
                            }
                            activeOpacity={0.88}
                            accessibilityRole="button"
                            accessibilityLabel={`Open linked activity ${relatedTitle}`}
                          >
                            <View style={styles.feedActivityBody}>
                              <Text style={[styles.feedSummary, { marginTop: 0 }]} numberOfLines={3}>
                                {summary}
                              </Text>
                              <Text style={styles.feedActivityTitle} numberOfLines={2}>
                                {relatedTitle}
                              </Text>
                              {relatedStatsLine ? (
                                <Text style={styles.feedActivityStats}>{relatedStatsLine}</Text>
                              ) : null}
                            </View>
                            {relatedMapUrl ? (
                              <Image
                                source={{ uri: relatedMapUrl }}
                                style={styles.feedActivityMap}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[styles.feedActivityMap, styles.feedActivityMapPlaceholder]}
                              >
                                <Text style={styles.feedActivityMapPhText}>No route</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.feedSummary} numberOfLines={2}>
                            {summary}
                          </Text>
                        )}
                        {createdEpoch != null && !Number.isNaN(createdEpoch) ? (
                          <Text style={styles.feedTimestamp}>
                            {formatRelativeFromUnix(createdEpoch)}
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
              <View style={styles.leaderboardHeaderBlock}>
                <Trophy size={16} color={tokens.accentYellow} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderboardScreenTitle}>Leaderboard</Text>
                  <Text style={styles.leaderboardHint}>
                    Top 10 by miles. 30 days = runs in the last 30 days. All time = runs
                    since each person joined this club. Goal = miles toward the selected
                    goal; each row shows that person’s share of the club’s total miles toward
                    this goal so far.
                  </Text>
                </View>
              </View>

              <View style={styles.lbFilterRow}>
                {(
                  [
                    { key: '30d' as const, label: '30 days' },
                    { key: '90d' as const, label: '90 days' },
                    { key: 'goal' as const, label: 'Goal' },
                  ] as const
                ).map(({ key, label }) => {
                  const isOn = lbMode === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        setLbMode(key);
                        if (key === 'goal' && allGoals[0] && !lbGoalId) {
                          setLbGoalId(allGoals[0].id);
                        }
                      }}
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
                        style={[
                          styles.pillLabel,
                          { color: tokens.textSecondary },
                          isOn && { color: '#fff' },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {lbMode === 'goal' && allGoals.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.goalChipRow}
                >
                  {allGoals.map((g) => {
                    const on = g.id === lbGoalId;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => setLbGoalId(g.id)}
                        style={[
                          styles.goalChip,
                          { borderColor: on ? tokens.accentBlue : tokens.divider },
                          on && { backgroundColor: tokens.surfaceElevated },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.goalChipText,
                            { color: on ? tokens.accentBlue : tokens.text },
                          ]}
                          numberOfLines={1}
                        >
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}

              {lbMode === 'goal' && allGoals.length === 0 ? (
                <Text style={styles.empty}>No goals in this club yet — create one to rank it.</Text>
              ) : clubLbQ.isLoading ? (
                <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 16 }} />
              ) : (clubLbQ.data?.data?.length ?? 0) === 0 ? (
                <Text style={styles.empty}>
                  {lbMode === 'goal' ? 'No contributions for this goal yet.' : 'No distance yet for this view.'}
                </Text>
              ) : (
                (clubLbQ.data?.data ?? []).map((e) => {
                  const miles = Number(e.total_distance_miles);
                  const key = e.user?.id ?? String(e.rank);
                  if (lbMode === 'goal' && goalCompletedMiles > 0) {
                    const pct = (miles / goalCompletedMiles) * 100;
                    return (
                      <View key={key} style={styles.goalLbRow}>
                        <View style={styles.goalLbTop}>
                          <Text style={styles.leaderboardRankMain}>{e.rank}.</Text>
                          <Text style={styles.leaderboardNameMain}>{e.user?.name ?? 'Unnamed'}</Text>
                          <Text style={styles.leaderboardMilesMain}>{formatMiles(miles)}</Text>
                        </View>
                        <View style={styles.goalLbBarRow}>
                          <View style={[styles.progressBar, styles.goalLbBar]}>
                            <View style={[styles.progressFill, { width: `${pct}%` }]} />
                          </View>
                          <Text style={[styles.goalLbPct, { color: tokens.accentOrange }]}>
                            {Math.round(pct)}%
                          </Text>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <View key={key} style={styles.leaderboardRowMain}>
                      <Text style={styles.leaderboardRankMain}>{e.rank}.</Text>
                      <Text style={styles.leaderboardNameMain}>{e.user?.name ?? 'Unnamed'}</Text>
                      <Text style={styles.leaderboardMilesMain}>{formatMiles(miles)}</Text>
                    </View>
                  );
                })
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
            <Text style={styles.leaderboardTitle}>Top 3 contributors</Text>
          </View>
          {top.slice(0, 3).map((e) => (
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
    leaderboardHeaderBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
    leaderboardScreenTitle: { color: t.text, fontSize: 15, fontWeight: '600' },
    leaderboardHint: { color: t.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
    lbFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    goalChipRow: { gap: 8, paddingRight: 8, marginBottom: 12 },
    goalChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
    },
    goalChipText: { fontSize: 13, fontWeight: '600', maxWidth: 200 },
    goalAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
    },
    goalAddRowText: { fontSize: 15, fontWeight: '600', flex: 1 },
    goalLbRow: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
      gap: 8,
    },
    goalLbTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    goalLbBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 36,
    },
    goalLbBar: { flex: 1 },
    goalLbPct: { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
    leaderboardRowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
    },
    leaderboardRankMain: { color: t.textMuted, fontSize: 14, width: 28, fontWeight: '600' },
    leaderboardNameMain: { color: t.text, fontSize: 15, flex: 1, fontWeight: '500' },
    leaderboardMilesMain: { color: t.textSecondary, fontSize: 14 },
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
    feedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    feedAuthor: { color: t.text, fontWeight: '600', fontSize: 13 },
    feedEditLabel: { fontSize: 12, fontWeight: '600' },
    feedSummary: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
    feedTimestamp: { color: t.textMuted, fontSize: 11, marginTop: 4 },
    feedActivityMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    feedActivityMap: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: t.surfaceElevated,
    },
    feedActivityMapPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    feedActivityMapPhText: { color: t.textMuted, fontSize: 10, fontWeight: '600' },
    feedActivityBody: { flex: 1, minWidth: 0 },
    feedActivityTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '600',
      marginTop: 2,
    },
    feedActivityStats: {
      color: t.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
  });
}
