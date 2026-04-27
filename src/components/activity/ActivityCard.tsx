import { useMemo } from 'react';
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

type Activity = components['schemas']['Activity'];

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const mapUrl = generateStaticMapUrl(activity.map_polyline, 600, 240, {
    style: tokens.mapStyle,
    pathColor: tokens.mapPathColor,
  });
  const userName = activity.user?.name ?? 'Unnamed runner';
  const avatar = activity.user?.avatar_url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
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
        <Image
          key={`${activity.id}-${mapUrl}`}
          source={{ uri: mapUrl }}
          style={styles.mapThumbnail}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.footer}>
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
    </TouchableOpacity>
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
    footer: { flexDirection: 'row', gap: 16 },
    engagement: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    count: { color: t.textSecondary, fontSize: 12 },
  });
}
