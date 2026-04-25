import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity } from '@/types';
import { Heart, MessageCircle, Flame } from 'lucide-react-native';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{activity.user.name}</Text>
        <Text style={styles.distance}>{activity.distance.toFixed(1)} mi</Text>
      </View>
      
      <Text style={styles.title}>{activity.title}</Text>
      
      <View style={styles.stats}>
        <Text style={styles.stat}>{activity.duration} min</Text>
        <Text style={styles.stat}>{activity.pace.toFixed(1)} min/mi</Text>
      </View>

      {activity.route && (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Route Map</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.engagement}>
          <Heart size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.count}>{activity.kudos}</Text>
        </View>
        <View style={styles.engagement}>
          <MessageCircle size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.count}>{activity.comments}</Text>
        </View>
        {activity.streak && (
          <View style={styles.engagement}>
            <Flame size={16} color="#FF6B35" />
            <Text style={styles.count}>{activity.streak}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  distance: {
    color: '#00A3E0',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  mapPlaceholder: {
    backgroundColor: '#1a1a1a',
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});
