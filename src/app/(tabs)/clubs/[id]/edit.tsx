import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Globe, Lock } from 'lucide-react-native';
import { useClub, useUpdateClub } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function EditClubScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQ = useClub(id);
  const updateClub = useUpdateClub(id ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');

  useEffect(() => {
    if (!clubQ.data) return;
    setName(clubQ.data.name ?? '');
    setDescription(clubQ.data.description ?? '');
    setPrivacy((clubQ.data.privacy_level as 'public' | 'private') ?? 'private');
  }, [clubQ.data]);

  const submit = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert('Club name is required');
      return;
    }
    try {
      await updateClub.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        privacy_level: privacy,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not save club', (e as Error)?.message ?? 'Try again later');
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Save club',
        onPress: submit,
        loading: updateClub.isPending,
        disabled: !name.trim() || updateClub.isPending || clubQ.isLoading,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, privacy, updateClub.isPending, clubQ.isLoading]);

  if (!id) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit club</Text>
      </View>
      {clubQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.body}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Saturday Long Run"
            placeholderTextColor={tokens.placeholder}
            value={name}
            onChangeText={setName}
            maxLength={80}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="What's this club about?"
            placeholderTextColor={tokens.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
          />

          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyRow}>
            <PrivacyOption
              label="Private"
              description="Invite-only"
              Icon={Lock}
              active={privacy === 'private'}
              onPress={() => setPrivacy('private')}
              tokens={tokens}
              styles={styles}
            />
            <PrivacyOption
              label="Public"
              description="Anyone can join"
              Icon={Globe}
              active={privacy === 'public'}
              onPress={() => setPrivacy('public')}
              tokens={tokens}
              styles={styles}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function PrivacyOption({
  label,
  description,
  Icon,
  active,
  onPress,
  tokens,
  styles,
}: {
  label: string;
  description: string;
  Icon: typeof Lock;
  active: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.privacyOption, active && styles.privacyOptionActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Icon size={16} color={active ? tokens.onPrimary : tokens.text} />
      <View>
        <Text style={[styles.privacyLabel, active && styles.privacyLabelActive]}>{label}</Text>
        <Text style={[styles.privacyDesc, active && styles.privacyDescActive]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22 },
    body: { paddingHorizontal: 20, gap: 8 },
    label: {
      color: t.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 4,
    },
    input: {
      backgroundColor: t.surfaceElevated,
      color: t.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    textarea: { minHeight: 96, textAlignVertical: 'top' },
    privacyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    privacyOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surfaceElevated,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    privacyOptionActive: { backgroundColor: t.primary },
    privacyLabel: { color: t.text, fontWeight: '600' },
    privacyLabelActive: { color: t.onPrimary },
    privacyDesc: { color: t.textSecondary, fontSize: 12 },
    privacyDescActive: { color: t.onPrimary, opacity: 0.7 },
  });
}
