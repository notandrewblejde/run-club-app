import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ClubCard } from '@/components/club/ClubCard';
import { Club } from '@/types';
import { useState } from 'react';

const MOCK_CLUBS: Club[] = [
  {
    id: '1',
    name: 'Morning Runners',
    description: 'Early risers on a mission',
    members: [
      { id: '1', name: 'Alex Johnson', avatar: '' },
      { id: '2', name: 'Sarah Connor', avatar: '' },
      { id: '3', name: 'Mike Davis', avatar: '' },
    ],
    memberCount: 12,
    totalDistance: 245.5,
    goal: {
      target: 500,
      progress: 245,
      unit: 'miles',
    },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Urban Trail Runners',
    description: 'City trails and parks',
    members: [
      { id: '4', name: 'Jamie Lee', avatar: '' },
      { id: '5', name: 'Chris Park', avatar: '' },
    ],
    memberCount: 8,
    totalDistance: 156.3,
    goal: {
      target: 300,
      progress: 156,
      unit: 'miles',
    },
    createdAt: new Date('2024-02-20'),
  },
];

export default function ClubsScreen() {
  const [clubs, setClubs] = useState<Club[]>(MOCK_CLUBS);

  const handleCreateClub = () => {
    // TODO: Navigate to create club modal/screen
  };

  const handleClubPress = (club: Club) => {
    // TODO: Navigate to club detail screen with feed, members, goals
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clubs</Text>
          <Text style={styles.subtitle}>{clubs.length} clubs joined</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateClub}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={clubs}
        renderItem={({ item }) => (
          <ClubCard club={item} onPress={() => handleClubPress(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  createButton: {
    backgroundColor: '#00A3E0',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
