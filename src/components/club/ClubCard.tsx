import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Club } from '@/types';
import { Users, Target } from 'lucide-react-native';

interface ClubCardProps {
  club: Club;
  onPress?: () => void;
}

export function ClubCard({ club, onPress }: ClubCardProps) {
  const progressPercent = club.goal ? (club.goal.progress / club.goal.target) * 100 : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{club.name}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {club.description}
          </Text>
        </View>
        <View style={styles.memberCount}>
          <Users size={16} color="#fff" />
          <Text style={styles.count}>{club.memberCount}</Text>
        </View>
      </View>

      {club.goal && (
        <View style={styles.goalSection}>
          <View style={styles.goalHeader}>
            <Target size={14} color="#00A3E0" />
            <Text style={styles.goalText}>
              {club.goal.progress} / {club.goal.target} {club.goal.unit}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPercent, 100)}%` }
              ]} 
            />
          </View>
        </View>
      )}
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    maxWidth: 200,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  goalSection: {
    gap: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00A3E0',
  },
});
