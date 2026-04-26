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
import { Camera, X } from 'lucide-react-native';
import { useActivity, useCreatePost, usePresignPostPhoto } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function NewClubPostScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id, activityId } = useLocalSearchParams<{ id: string; activityId?: string }>();
  const createPost = useCreatePost(id ?? '');
  const presignPhoto = usePresignPostPhoto(id ?? '');
  const linkedActivityQ = useActivity(activityId, { enabled: !!activityId });
  const { setActions, clearActions } = useBottomBarActions();

  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const prefilledFromActivity = useRef(false);

  useEffect(() => {
    if (!activityId || prefilledFromActivity.current || !linkedActivityQ.data) return;
    prefilledFromActivity.current = true;
    const a = linkedActivityQ.data;
    const miles =
      a.distance_miles != null && typeof a.distance_miles === 'number'
        ? `${a.distance_miles.toFixed(1)} mi`
        : '';
    setContent(miles ? `${a.name} (${miles})` : (a.name ?? 'Shared a run'));
  }, [activityId, linkedActivityQ.data]);

  const submit = async () => {
    if (!id) return;
    if (!content.trim()) {
      Alert.alert('Post text is required');
      return;
    }
    try {
      await createPost.mutateAsync({
        content: content.trim(),
        photos,
        ...(activityId ? { related_activity_id: activityId } : {}),
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not create post', (e as Error)?.message ?? 'Try again later');
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
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error)?.message ?? 'Try again later');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Post',
        onPress: submit,
        loading: createPost.isPending,
        disabled: !content.trim() || createPost.isPending || uploading,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, photos, createPost.isPending, uploading]);

  if (!id) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New post</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What&apos;s new?</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Share an update with your club"
          placeholderTextColor={tokens.placeholder}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
        />

        <View style={styles.photosHeader}>
          <Text style={styles.label}>Photos</Text>
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

        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((url) => (
              <View key={url} style={styles.photoWrap}>
                <Image source={{ uri: url }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                  hitSlop={8}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.hint}>No photos yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22 },
    body: { paddingHorizontal: 20, paddingBottom: 140 },
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
