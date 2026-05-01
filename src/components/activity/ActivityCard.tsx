import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, Award } from 'lucide-react-native';
import type { components } from '@/api/schema';
import { generateStaticMapUrl } from '@/utils/mapbox';
import {
  formatDuration,
  formatMiles,
  formatPace,
  formatRelativeFromUnix,
} from '@/utils/format';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import { useMyClubs } from '@/api/hooks';
import { ActivityShareTrigger } from '@/components/activity/ActivityShareTrigger';
import { ShareToClubModal } from '@/components/activity/ShareToClubModal';

type Activity = components['schemas']['Activity'];

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const myClubsQ = useMyClubs();
  const clubs = myClubsQ.data?.data ?? [];
  const [shareClubOpen, setShareClubOpen] = useState(false);

  const mapUrl = generateStaticMapUrl(activity.map_polyline, 600, 240, {
    style: tokens.mapStyle,
    pathColor: tokens.mapPathColor,
  });
  const userName = activity.user?.name ?? 'Unnamed runner';
  const avatar = activity.user?.avatar_url;
  const isMine = activity.owned_by_viewer === true;

  const pickClubForShare = (clubId: string) => {
    setShareClubOpen(false);
    router.push({
      pathname: '/(tabs)/clubs/[id]/posts/new',
      params: { id: clubId, activityId: activity.id },
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <ShareToClubModal
        visible={shareClubOpen}
        onDismiss={() => setShareClubOpen(false)}
        clubs={clubs}
        onPickClub={pickClubForShare}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.7}
          onPress={(e) => {
            e.stopPropagation?.();
            if (activity.user?.id) router.push(`/(tabs)/users/${activity.user.id}`);
          }}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{userName.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.timestamp}>{formatRelativeFromUnix(activity.start_date)}</Text>
          </View>
        </TouchableOpacity>
        {activity.personal_record ? (
          <View style={styles.prBadge}>
            <Award size={12} color="#0F0F0F" />
            <Text style={styles.prText}>PR</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {activity.name}
      </Text>

      <View style={styles.stats}>
        <Stat label="Distance" value={formatMiles(activity.distance_miles)} styles={styles} />
        <Stat label="Time" value={formatDuration(activity.moving_time_secs)} styles={styles} />
        <Stat
          label="Pace"
          value={activity.avg_pace_display ?? formatPace(activity.avg_pace_secs_per_mile)}
          styles={styles}
        />
      </View>

      {mapUrl ? (
        <ActivityMediaGrid
          mapUrl={mapUrl}
          activityId={activity.id ?? ''}
          photos={activity.app_photos ?? []}
          styles={styles}
        />
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.engagement}>
            <Heart
              size={16}
              color={activity.kudoed_by_viewer ? tokens.accentOrange : tokens.textMuted}
              fill={activity.kudoed_by_viewer ? tokens.accentOrange : 'transparent'}
            />
            <Text style={styles.count}>{activity.kudos_count}</Text>
          </View>
          <View style={styles.engagement}>
            <MessageCircle size={16} color={tokens.textMuted} />
            <Text style={styles.count}>{activity.comment_count}</Text>
          </View>
        </View>
        {isMine ? (
          <ActivityShareTrigger
            activity={activity}
            mapUrl={mapUrl}
            clubs={clubs}
            onOpenClubModal={() => setShareClubOpen(true)}
            iconSize={18}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Photo grid below the stats row.
 * - 0 photos: full-width map thumbnail (existing behaviour)
 * - 1 photo:  map left (60%) | photo right (40%), same height
 * - 2 photos: map left (60%) | two photos stacked right (40%)
 * Map is always shown; only first 2 user photos are displayed.
 */
function ActivityMediaGrid({
  mapUrl,
  activityId,
  photos,
  styles,
}: {
  mapUrl: string;
  activityId: string;
  photos: string[];
  styles: ReturnType<typeof makeStyles>;
}) {
  const visiblePhotos = photos.slice(0, 2);

  if (visiblePhotos.length === 0) {
    return (
      <Image
        key={`${activityId}-${mapUrl}`}
        source={{ uri: mapUrl }}
        style={styles.mapThumbnail}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {/* Map — always left, fills height */}
      <Image
        key={`${activityId}-${mapUrl}`}
        source={{ uri: mapUrl }}
        style={styles.mediaMap}
        resizeMode="cover"
      />
      {/* Photos — stacked on the right */}
      <View style={styles.mediaPhotos}>
        {visiblePhotos.map((uri, i) => (
          <Image
            key={uri}
            source={{ uri }}
            style={[
              styles.mediaPhoto,
              visiblePhotos.length === 1 && styles.mediaPhotoSingle,
              visiblePhotos.length === 2 && i === 0 && styles.mediaPhotoTop,
              visiblePhotos.length === 2 && i === 1 && styles.mediaPhotoBottom,
            ]}
            resizeMode="cover"
          />
        ))}
      </View>
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
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700' },
    name: { color: t.text, fontSize: 14, fontWeight: '600' },
    timestamp: { color: t.textMuted, fontSize: 12 },
    prBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.accentYellow,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    prText: { color: '#0F0F0F', fontWeight: '700', fontSize: 11 },
    title: { color: t.text, fontSize: 16, fontWeight: '500', marginBottom: 12 },
    stats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    statBlock: { flex: 1 },
    statLabel: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statValue: { color: t.text, fontSize: 14, fontWeight: '600' },
    mapThumbnail: {
      height: 140,
      width: '100%',
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: t.surfaceElevated,
    },
    // Photo grid
    mediaGrid: {
      flexDirection: 'row',
      height: 140,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12,
      gap: 2,
    },
    mediaMap: {
      flex: 3, // 60%
      height: '100%',
      backgroundColor: t.surfaceElevated,
    },
    mediaPhotos: {
      flex: 2, // 40%
      flexDirection: 'column',
      gap: 2,
    },
    mediaPhoto: {
      flex: 1,
      backgroundColor: t.surfaceElevated,
    },
    mediaPhotoSingle: {
      flex: 1,
    },
    mediaPhotoTop: {
      flex: 1,
    },
    mediaPhotoBottom: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    engagement: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    count: { color: t.textSecondary, fontSize: 12 },
  });
}
