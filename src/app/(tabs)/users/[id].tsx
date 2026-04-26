import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, UserCheck } from 'lucide-react-native';
import {
  useFollowUser,
  useUnfollowUser,
  useUser,
  useUserActivities,
} from '@/api/hooks';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { formatDuration, formatMiles } from '@/utils/format';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function UserProfileScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileQ = useUser(id);
  const activitiesQ = useUserActivities(id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  if (!id) return null;
  const profile = profileQ.data;
  const isLoading = profileQ.isLoading && !profile;

  const onFollowPress = async () => {
    if (!profile) return;
    if (profile.is_self) return;
    try {
      if (profile.follow_status === 'none') {
        const result = await follow.mutateAsync(profile.id);
        if (result.status === 'pending') {
          Alert.alert('Request sent', 'Awaiting their approval.');
        }
      } else {
        // 'pending' or 'accepted' — both call DELETE on the same row
        await unfollow.mutateAsync(profile.id);
      }
    } catch (e: unknown) {
      Alert.alert('Could not update', (e as Error)?.message ?? 'Try again later');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Could not load profile</Text>
      </View>
    );
  }

  const isPrivate = profile.privacy_level === 'private';
  const showActivities =
    profile.is_self || !isPrivate || profile.follow_status === 'accepted';
  const followLabel = followLabelFor(profile.follow_status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={profileQ.isFetching && !profileQ.isLoading}
          onRefresh={profileQ.refetch}
          tintColor={tokens.accentBlue}
        />
      }
    >
      <View style={styles.identity}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {(profile.name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name ?? 'Unnamed runner'}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {(profile.city || profile.state) ? (
          <Text style={styles.location}>
            {[profile.city, profile.state].filter(Boolean).join(', ')}
          </Text>
        ) : null}

        <View style={styles.followsRow}>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/users/${profile.id}/followers`)}
            hitSlop={6}
          >
            <Counter
              label="Followers"
              value={profile.followers_count}
              styles={styles}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/users/${profile.id}/following`)}
            hitSlop={6}
          >
            <Counter
              label="Following"
              value={profile.following_count}
              styles={styles}
            />
          </TouchableOpacity>
        </View>

        {!profile.is_self ? (
          <TouchableOpacity
            style={[
              styles.followBtn,
              profile.follow_status === 'accepted' && styles.followBtnAccepted,
              profile.follow_status === 'pending' && styles.followBtnPending,
            ]}
            onPress={onFollowPress}
            disabled={follow.isPending || unfollow.isPending}
          >
            {profile.follow_status === 'accepted' ? (
              <UserCheck size={14} color={tokens.text} />
            ) : null}
            <Text
              style={[
                styles.followLabel,
                profile.follow_status !== 'none' && styles.followLabelOnSurface,
              ]}
            >
              {followLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Stats</Text>
        <View style={styles.statsGrid}>
          <Stat label="Activities" value={`${profile.stats.total_activities}`} styles={styles} />
          <Stat label="Distance" value={formatMiles(profile.stats.total_distance_miles)} styles={styles} />
          <Stat label="Time" value={formatDuration(profile.stats.total_moving_seconds)} styles={styles} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent runs</Text>
      {!showActivities ? (
        <View style={styles.lockedCard}>
          <Lock size={20} color={tokens.textMuted} />
          <Text style={styles.lockedText}>
            This profile is private. Follow to see their runs.
          </Text>
        </View>
      ) : activitiesQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 16 }} />
      ) : (activitiesQ.data?.data ?? []).length === 0 ? (
        <Text style={styles.muted}>No runs yet.</Text>
      ) : (
        (activitiesQ.data?.data ?? []).map((a) => (
          <ActivityCard
            key={a.id}
            activity={a}
            onPress={() =>
              router.push(
                `/(tabs)/activity/${a.id}?from=profile&profileId=${encodeURIComponent(id)}`,
                { withAnchor: true },
              )
            }
          />
        ))
      )}
    </ScrollView>
  );
}

function followLabelFor(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Following';
    case 'pending':
      return 'Requested';
    default:
      return 'Follow';
  }
}

function Counter({
  label,
  value,
  styles,
}: {
  label: string;
  value: number | string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterValue}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

function Stat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    muted: { color: t.textMuted, paddingHorizontal: 20 },
    scroll: { paddingTop: 60, paddingBottom: 140, paddingHorizontal: 20 },
    identity: { alignItems: 'center', paddingVertical: 16 },
    avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    name: { color: t.text, fontSize: 22, fontWeight: '700' },
    bio: { color: t.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' },
    location: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    followsRow: { flexDirection: 'row', gap: 28, marginTop: 16, marginBottom: 16 },
    counter: { alignItems: 'center' },
    counterValue: { color: t.text, fontSize: 18, fontWeight: '700' },
    counterLabel: { color: t.textMuted, fontSize: 12 },
    followBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 999,
    },
    followBtnAccepted: {
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    followBtnPending: {
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    followLabel: { color: t.onPrimary, fontSize: 14, fontWeight: '600' },
    followLabelOnSurface: { color: t.text },
    statsCard: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    statsTitle: { color: t.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
    statsGrid: { flexDirection: 'row' },
    statBlock: { flex: 1 },
    statLabel: { color: t.textMuted, fontSize: 11, textTransform: 'uppercase' },
    statValue: { color: t.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
    sectionTitle: { color: t.text, fontWeight: '600', fontSize: 15, marginBottom: 8 },
    lockedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    lockedText: { color: t.textSecondary, fontSize: 13, flex: 1 },
  });
}
