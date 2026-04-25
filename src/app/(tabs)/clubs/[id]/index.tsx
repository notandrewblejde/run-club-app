import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, Target } from 'lucide-react-native';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { useState } from 'react';

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // TODO: Fetch club data based on ID
  const club = {
    id,
    name: 'Morning Runners',
    description: 'Early risers on a mission',
    memberCount: 12,
    totalDistance: 245.5,
    goal: {
      target: 500,
      progress: 245,
      unit: 'miles',
    },
  };

  const members = [
    { id: '1', name: 'Alex Johnson', avatar: '' },
    { id: '2', name: 'Sarah Connor', avatar: '' },
    { id: '3', name: 'Mike Davis', avatar: '' },
  ];

  const clubActivities: any[] = [];

  const progressPercent = (club.goal.progress / club.goal.target) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{club.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>{club.description}</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color="#00A3E0" />
            <Text style={styles.sectionTitle}>Club Goal</Text>
          </View>
          <View style={styles.goalCard}>
            <Text style={styles.goalProgress}>
              {club.goal.progress} / {club.goal.target} {club.goal.unit}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercent, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercent}>
              {Math.round(progressPercent)}% Complete
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={18} color="#00A3E0" />
            <Text style={styles.sectionTitle}>Members ({club.memberCount})</Text>
          </View>
          {members.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.name.charAt(0)}
                </Text>
              </View>
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Club Feed</Text>
          {clubActivities.length === 0 && (
            <Text style={styles.emptyState}>No activities yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  goalCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  goalProgress: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00A3E0',
  },
  progressPercent: {
    fontSize: 12,
    color: '#00A3E0',
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  memberName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  emptyState: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 32,
  },
});
