import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Lock, Globe } from 'lucide-react-native';
import { useMe, usePresignAvatar, useUpdateMe } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type Privacy = 'public' | 'private';

export default function EditProfileScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const meQ = useMe();
  const update = useUpdateMe();
  const presign = usePresignAvatar();
  const { setActions, clearActions } = useBottomBarActions();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!meQ.data) return;
    setName(meQ.data.name ?? '');
    setBio(meQ.data.bio ?? '');
    setCity(meQ.data.city ?? '');
    setState(meQ.data.state ?? '');
    setPrivacy(meQ.data.privacy_level ?? 'public');
    setAvatarUrl(meQ.data.avatar_url);
  }, [meQ.data]);

  const submit = async () => {
    try {
      await update.mutateAsync({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        privacy_level: privacy,
        avatar_url: avatarUrl,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not save', (e as Error)?.message ?? 'Try again later');
    }
  };

  const pickAndUploadAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required to change your avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const contentType = asset.mimeType ?? 'image/jpeg';

      setUploadingAvatar(true);
      const presigned = await presign.mutateAsync(contentType);

      // Re-read the local file as a binary blob and PUT directly to S3.
      const fileResp = await fetch(asset.uri);
      const blob = await fileResp.blob();
      const putResp = await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putResp.ok) {
        throw new Error(`S3 upload failed (${putResp.status})`);
      }
      setAvatarUrl(presigned.public_url);
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error)?.message ?? 'Try again later');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Save',
        onPress: submit,
        loading: update.isPending,
        disabled: update.isPending || uploadingAvatar,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bio, city, state, privacy, avatarUrl, update.isPending, uploadingAvatar]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={pickAndUploadAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.85}
            style={styles.avatarWrap}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>
                  {(name ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Camera size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change avatar</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={tokens.placeholder}
          maxLength={80}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="A few words about you"
          placeholderTextColor={tokens.placeholder}
          multiline
          maxLength={500}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="San Francisco"
              placeholderTextColor={tokens.placeholder}
              maxLength={100}
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={setState}
              placeholder="CA"
              placeholderTextColor={tokens.placeholder}
              maxLength={100}
            />
          </View>
        </View>

        <Text style={styles.label}>Privacy</Text>
        <View style={styles.privacyRow}>
          <PrivacyOption
            label="Public"
            description="Anyone can follow"
            Icon={Globe}
            active={privacy === 'public'}
            onPress={() => setPrivacy('public')}
            tokens={tokens}
            styles={styles}
          />
          <PrivacyOption
            label="Private"
            description="Approve follow requests"
            Icon={Lock}
            active={privacy === 'private'}
            onPress={() => setPrivacy('private')}
            tokens={tokens}
            styles={styles}
          />
        </View>
      </ScrollView>
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
    body: { paddingHorizontal: 20, paddingBottom: 140 },
    avatarRow: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    avatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.accentOrange,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.background,
    },
    avatarHint: { color: t.textMuted, fontSize: 12, marginTop: 8 },
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
    row: { flexDirection: 'row', gap: 10 },
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
