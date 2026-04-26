import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, X } from 'lucide-react-native';
import { useActivity, usePresignActivityPhoto, useUpdateActivity } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function EditActivityDetailsScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityQ = useActivity(id);
  const updateActivity = useUpdateActivity(id ?? '');
  const presignPhoto = usePresignActivityPhoto(id ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const [note, setNote] = useState('');
  const [appPhotos, setAppPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
  }, [id]);

  useEffect(() => {
    if (!activityQ.data || hydrated.current) return;
    hydrated.current = true;
    setNote(activityQ.data.user_note ?? '');
    setAppPhotos(activityQ.data.app_photos ?? []);
  }, [activityQ.data]);

  const submit = async () => {
    if (!id) return;
    try {
      await updateActivity.mutateAsync({
        user_note: note.trim(),
        app_photos: appPhotos,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not save', (e as Error)?.message ?? 'Try again later');
    }
  };

  const pickAndUploadPhotos = async () => {
    if (!id) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required to add photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        const contentType = asset.mimeType ?? 'image/jpeg';
        const presigned = await presignPhoto.mutateAsync(contentType);
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
        uploaded.push(presigned.public_url);
      }
      setAppPhotos((prev) => [...prev, ...uploaded]);
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error)?.message ?? 'Try again later');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Save',
        onPress: submit,
        loading: updateActivity.isPending,
        disabled: updateActivity.isPending || uploading || !activityQ.data,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, appPhotos, updateActivity.isPending, uploading, activityQ.data]);

  if (!id) return null;

  if (activityQ.isLoading || !activityQ.data) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }

  if (!activityQ.data.owned_by_viewer) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>You can only edit your own activities.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit details</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>
          Add a note and photos that stay in Run Club. Strava sync will not remove these.
        </Text>

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="How did it feel? Anything you want to remember?"
          placeholderTextColor={tokens.placeholder}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={5000}
        />

        <View style={styles.photosHeader}>
          <Text style={styles.label}>Your photos</Text>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={pickAndUploadPhotos}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color={tokens.text} size="small" />
            ) : (
              <Camera size={14} color={tokens.text} />
            )}
            <Text style={styles.photoButtonText}>{uploading ? 'Uploading…' : 'Add photos'}</Text>
          </TouchableOpacity>
        </View>

        {appPhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {appPhotos.map((url) => (
              <View key={url} style={styles.photoWrap}>
                <Image source={{ uri: url }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setAppPhotos((prev) => prev.filter((p) => p !== url))}
                  hitSlop={8}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.hint}>Strava photos still appear on the activity; these are extra.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: t.textSecondary, textAlign: 'center' },
    backLink: { marginTop: 16 },
    backLinkText: { color: t.accentBlue, fontWeight: '600' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
    },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 18 },
    body: { paddingHorizontal: 20, paddingBottom: 140 },
    help: { color: t.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
    label: {
      color: t.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 6,
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
    textarea: { minHeight: 120, textAlignVertical: 'top' },
    photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    photoButton: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    photoButtonText: { color: t.text, fontSize: 12, fontWeight: '600' },
    photoRow: { gap: 10, paddingTop: 8, paddingBottom: 4 },
    photoWrap: { position: 'relative' },
    photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: t.surfaceElevated },
    photoRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    hint: { color: t.textMuted, marginTop: 8 },
  });
}
