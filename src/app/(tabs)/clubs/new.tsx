import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Globe, Lock } from 'lucide-react-native';
import { useCreateClub } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';

export default function CreateClubScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const createClub = useCreateClub();
  const { setActions, clearActions } = useBottomBarActions();

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Club name is required');
      return;
    }
    try {
      const club = await createClub.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        privacy_level: privacy,
      });
      router.replace(`/(tabs)/clubs/${club.id}`);
    } catch (e: unknown) {
      Alert.alert('Could not create club', (e as Error)?.message ?? 'Try again later');
    }
  };

  // Push the primary action into the bottom bar. Re-pushed whenever inputs
  // change so disabled/loading state stays in sync.
  useEffect(() => {
    setActions([
      {
        label: 'Create club',
        onPress: submit,
        loading: createClub.isPending,
        disabled: !name.trim() || createClub.isPending,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, privacy, createClub.isPending]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New club</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Saturday Long Run"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={80}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="What's this club about?"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <Text style={styles.label}>Privacy</Text>
        <View style={styles.privacyRow}>
          <PrivacyOption
            label="Private"
            description="Invite-only"
            Icon={Lock}
            active={privacy === 'private'}
            onPress={() => setPrivacy('private')}
          />
          <PrivacyOption
            label="Public"
            description="Anyone can join"
            Icon={Globe}
            active={privacy === 'public'}
            onPress={() => setPrivacy('public')}
          />
        </View>
      </View>
    </View>
  );
}

function PrivacyOption({
  label,
  description,
  Icon,
  active,
  onPress,
}: {
  label: string;
  description: string;
  Icon: typeof Lock;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.privacyOption, active && styles.privacyOptionActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Icon size={16} color={active ? '#0F0F0F' : '#fff'} />
      <View>
        <Text style={[styles.privacyLabel, active && styles.privacyLabelActive]}>{label}</Text>
        <Text style={[styles.privacyDesc, active && styles.privacyDescActive]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 22 },
  body: { paddingHorizontal: 20, gap: 8 },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#161618',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  privacyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161618',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  privacyOptionActive: { backgroundColor: '#fff' },
  privacyLabel: { color: '#fff', fontWeight: '600' },
  privacyLabelActive: { color: '#0F0F0F' },
  privacyDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  privacyDescActive: { color: 'rgba(15,15,15,0.7)' },
});
