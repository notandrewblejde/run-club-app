import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'lucide-react-native';
import StravaConnectPanel from '@/components/connectStrava/StravaConnectPanel';
import {
  useMe,
  usePresignAvatar,
  usePutTrainingGoal,
  useTrainingGoal,
  useUpdateMe,
} from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

/**
 * Post-sign-in flow: (1) name, photo, training goal for the AI coach, (2) Strava.
 * Users who already linked Strava are sent straight to the feed.
 */
export default function OnboardingScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
  const meQ = useMe();
  const trainingGoalQ = useTrainingGoal();
  const updateMe = useUpdateMe();
  const putGoal = usePutTrainingGoal();
  const presign = usePresignAvatar();
  const { setActions, clearActions } = useBottomBarActions();

  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [goalText, setGoalText] = useState('');
  const goalHydrated = useRef(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingStep0, setSavingStep0] = useState(false);

  useEffect(() => {
    if (meQ.data?.strava_connected) {
      router.replace('/(tabs)/feed');
    }
  }, [meQ.data?.strava_connected]);

  // Depend on primitives only — `meQ.data` is often a new object reference each render
  // from React Query, which would re-run this effect forever ("Maximum update depth exceeded").
  const meId = meQ.data?.id;
  const meName = meQ.data?.name;
  const meAvatar = meQ.data?.avatar_url;
  useEffect(() => {
    if (meId == null) return;
    setName(meName ?? '');
    setAvatarUrl(meAvatar);
  }, [meId, meName, meAvatar]);

  useEffect(() => {
    if (goalHydrated.current || !trainingGoalQ.isSuccess) return;
    const g = trainingGoalQ.data?.goal_text;
    if (g != null) setGoalText(g);
    goalHydrated.current = true;
  }, [trainingGoalQ.isSuccess, trainingGoalQ.data?.goal_text]);

  const pickAndUploadAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required to set your photo.');
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

      const fileResp = await fetch(asset.uri);
      const blob = await fileResp.blob();
      const putResp = await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putResp.ok) {
        throw new Error(`Upload failed (${putResp.status})`);
      }
      setAvatarUrl(presigned.public_url);
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error)?.message ?? 'Try again later');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const goStep1 = useCallback(() => {
    setStep(1);
  }, []);

  const saveProfileAndGoal = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Add how you want to appear in Run Club.');
      return;
    }
    try {
      setSavingStep0(true);
      await Promise.all([
        updateMe.mutateAsync({
          name: trimmed,
          avatar_url: avatarUrl,
        }),
        putGoal.mutateAsync(goalText.trim()),
      ]);
      goStep1();
    } catch (e: unknown) {
      Alert.alert('Could not save', (e as Error)?.message ?? 'Try again later');
    } finally {
      setSavingStep0(false);
    }
  }, [name, avatarUrl, goalText, updateMe, putGoal, goStep1]);

  const saveProfileRef = useRef(saveProfileAndGoal);
  saveProfileRef.current = saveProfileAndGoal;

  useFocusEffect(
    useCallback(() => {
      if (step !== 0) {
        return;
      }
      setActions([
        {
          label: 'Skip',
          onPress: goStep1,
          variant: 'outlined',
        },
        {
          label: 'Continue',
          onPress: () => void saveProfileRef.current(),
          loading: savingStep0,
          disabled: savingStep0 || uploadingAvatar || !name.trim(),
        },
      ]);
      return () => clearActions();
    }, [step, savingStep0, uploadingAvatar, name, goStep1, setActions, clearActions]),
  );

  if (meQ.isLoading || !meQ.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} size="large" />
      </View>
    );
  }

  if (meQ.data.strava_connected) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.stepHeader}>
        <StepTab label="You" active={step === 0} tokens={tokens} />
        <View style={[styles.stepLine, { backgroundColor: step >= 1 ? tokens.accentBlue : tokens.border }]} />
        <StepTab label="Strava" active={step === 1} tokens={tokens} />
      </View>

      {step === 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Set up your profile</Text>
          <Text style={styles.screenSubtitle}>
            Your name and photo show on activities and clubs. Your goal helps the AI coach personalize guidance.
          </Text>

          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={() => void pickAndUploadAvatar()}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
              style={styles.avatarWrap}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
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
            <Text style={styles.avatarHint}>Tap to add a photo</Text>
          </View>

          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={tokens.placeholder}
            maxLength={80}
            autoCorrect={false}
          />

          <Text style={styles.label}>Training goal</Text>
          <Text style={styles.goalHint}>What are you working toward? You can change this anytime in Coach.</Text>
          <TextInput
            style={[styles.input, styles.goalInput]}
            value={goalText}
            onChangeText={setGoalText}
            placeholder="e.g. Build to a half marathon this fall, stay healthy, or PR my 5K"
            placeholderTextColor={tokens.placeholder}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
        </ScrollView>
      ) : (
        <StravaConnectPanel />
      )}
    </View>
  );
}

function StepTab({
  label,
  active,
  tokens,
}: {
  label: string;
  active: boolean;
  tokens: ThemeTokens;
}) {
  return (
    <View style={{ alignItems: 'center', minWidth: 72 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: active ? tokens.accentBlue : tokens.surfaceElevated,
          borderWidth: active ? 0 : StyleSheet.hairlineWidth,
          borderColor: tokens.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: active ? '#fff' : tokens.textMuted, fontSize: 12, fontWeight: '700' }}>
          {label === 'You' ? '1' : '2'}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: '600',
          color: active ? tokens.text : tokens.textSecondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: 32,
      marginBottom: 8,
      gap: 8,
    },
    stepLine: {
      height: 2,
      flex: 1,
      maxWidth: 80,
      alignSelf: 'center',
      marginTop: 13,
      borderRadius: 1,
    },
    scrollBody: { paddingHorizontal: 24, paddingBottom: 140 },
    screenTitle: { color: t.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
    screenSubtitle: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 },
    avatarRow: { alignItems: 'center', marginBottom: 8 },
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
    goalHint: { color: t.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
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
    goalInput: { minHeight: 120 },
  });
}
