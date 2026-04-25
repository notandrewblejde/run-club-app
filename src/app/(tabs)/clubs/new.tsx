import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Globe, Lock } from 'lucide-react-native';
import { useCreateClub } from '@/api/hooks';

export default function CreateClubScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const createClub = useCreateClub();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New club</Text>
        <View style={{ width: 22 }} />
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

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.cta,
            (!name.trim() || createClub.isPending) && styles.ctaDisabled,
          ]}
          onPress={submit}
          disabled={!name.trim() || createClub.isPending}
        >
          {createClub.isPending ? (
            <ActivityIndicator color="#0F0F0F" />
          ) : (
            <Text style={styles.ctaText}>Create club</Text>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { color: '#fff', fontWeight: '600', fontSize: 16 },
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
  footer: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  cta: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#0F0F0F', fontWeight: '700', fontSize: 15 },
});
