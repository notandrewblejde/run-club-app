import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageCircle, Award } from 'lucide-react-native';
import type { components } from '@/api/schema';
import { generateStaticMapUrl } from '@/utils/mapbox';
import {
  formatDuration,
  formatMiles,
  formatPace,
  formatRelativeFromUnix,
} from '@/utils/format';

type Activity = components['schemas']['Activity'];

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const mapUrl = generateStaticMapUrl(activity.map_polyline, 600, 240);
  const userName = activity.user?.name ?? 'Unnamed runner';
  const avatar = activity.user?.avatar_url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
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
        </View>
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
        <Stat label="Distance" value={formatMiles(activity.distance_miles)} />
        <Stat label="Time" value={formatDuration(activity.moving_time_secs)} />
        <Stat
          label="Pace"
          value={activity.avg_pace_display ?? formatPace(activity.avg_pace_secs_per_mile)}
        />
      </View>

      {mapUrl ? (
        <Image source={{ uri: mapUrl }} style={styles.mapThumbnail} resizeMode="cover" />
      ) : null}

      <View style={styles.footer}>
        <View style={styles.engagement}>
          <Heart
            size={16}
            color={activity.kudoed_by_viewer ? '#FF6B35' : 'rgba(255,255,255,0.6)'}
            fill={activity.kudoed_by_viewer ? '#FF6B35' : 'transparent'}
          />
          <Text style={styles.count}>{activity.kudos_count}</Text>
        </View>
        <View style={styles.engagement}>
          <MessageCircle size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.count}>{activity.comment_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    backgroundColor: '#00A3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#000', fontWeight: '700' },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timestamp: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD24A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  prText: { color: '#0F0F0F', fontWeight: '700', fontSize: 11 },
  title: { color: '#fff', fontSize: 16, fontWeight: '500', marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statBlock: { flex: 1 },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mapThumbnail: {
    height: 140,
    width: '100%',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#000',
  },
  footer: { flexDirection: 'row', gap: 16 },
  engagement: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
});
