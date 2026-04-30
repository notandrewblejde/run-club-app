import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link2, Share as ShareIcon, Image as ImageIcon, Users, X } from 'lucide-react-native';
import type { ThemeTokens } from '@/theme/tokens';
type Props = {
  visible: boolean;
  onDismiss: () => void;
  mapUrl: string | null;
  headline: string;
  statsLine: string;
  shareUrl: string;
  tokens: ThemeTokens;
  onCopyLink: () => Promise<boolean>;
  onSystemShare: () => void;
  onShareMapImage: (() => void) | null;
  onShareToClub: () => void;
};

export function ActivityShareSheet({
  visible,
  onDismiss,
  mapUrl,
  headline,
  statsLine,
  shareUrl,
  tokens,
  onCopyLink,
  onSystemShare,
  onShareMapImage,
  onShareToClub,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const styles = useMemo(() => makeSheetStyles(tokens), [tokens]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) setCopied(false);
  }, [visible]);

  const hostHint = useMemo(() => {
    try {
      return new URL(shareUrl).host;
    } catch {
      return 'Run Club';
    }
  }, [shareUrl]);

  const wrapClose = (fn: () => void) => () => {
    fn();
    onDismiss();
  };

  const handleCopy = () => {
    void (async () => {
      const ok = await onCopyLink();
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    })();
  };

  const maxSheet = Math.min(winH * 0.72, 520);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss share" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight: maxSheet }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Share</Text>
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={22} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewCard}>
              {mapUrl ? (
                <Image source={{ uri: mapUrl }} style={styles.previewMap} resizeMode="cover" />
              ) : (
                <View style={[styles.previewMap, styles.previewMapPlaceholder]}>
                  <Text style={styles.previewMapPlaceholderText}>Run Club</Text>
                </View>
              )}
              <Text style={styles.previewHeadline} numberOfLines={2}>
                {headline}
              </Text>
              <Text style={styles.previewStats} numberOfLines={2}>
                {statsLine}
              </Text>
              <Text style={styles.previewHost} numberOfLines={1}>
                {hostHint}
              </Text>
            </View>

            {copied ? (
              <Text style={styles.copiedBanner}>Link copied</Text>
            ) : null}

            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickItem}
                onPress={handleCopy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Copy link"
              >
                <View style={[styles.quickIconWrap, { backgroundColor: tokens.surfaceElevated }]}>
                  <Link2 size={22} color={tokens.text} />
                </View>
                <Text style={styles.quickLabel}>Copy link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickItem}
                onPress={wrapClose(onSystemShare)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Share via"
              >
                <View style={[styles.quickIconWrap, { backgroundColor: tokens.surfaceElevated }]}>
                  <ShareIcon size={22} color={tokens.text} />
                </View>
                <Text style={styles.quickLabel}>Share via…</Text>
              </TouchableOpacity>
              {onShareMapImage ? (
                <TouchableOpacity
                  style={styles.quickItem}
                  onPress={wrapClose(onShareMapImage)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Share map image"
                >
                  <View style={[styles.quickIconWrap, { backgroundColor: tokens.surfaceElevated }]}>
                    <ImageIcon size={22} color={tokens.text} />
                  </View>
                  <Text style={styles.quickLabel}>Map image</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.quickItem}
                onPress={wrapClose(onShareToClub)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Share to club"
              >
                <View style={[styles.quickIconWrap, { backgroundColor: tokens.surfaceElevated }]}>
                  <Users size={22} color={tokens.text} />
                </View>
                <Text style={styles.quickLabel}>Club</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeSheetStyles(t: ThemeTokens) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
      backgroundColor: t.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.textMuted,
      opacity: 0.35,
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sheetTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '700',
    },
    scroll: { maxHeight: 440 },
    scrollContent: { paddingBottom: 12 },
    previewCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      padding: 14,
      marginBottom: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    previewMap: {
      width: '100%',
      height: 120,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: t.background,
    },
    previewMapPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewMapPlaceholderText: {
      color: t.textMuted,
      fontWeight: '700',
      fontSize: 15,
    },
    previewHeadline: {
      color: t.text,
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 4,
    },
    previewStats: {
      color: t.textSecondary,
      fontSize: 14,
      marginBottom: 6,
    },
    previewHost: {
      color: t.textMuted,
      fontSize: 12,
    },
    copiedBanner: {
      color: t.accentBlue,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 10,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 16,
      marginBottom: 8,
    },
    quickItem: {
      flexGrow: 1,
      flexBasis: '22%',
      minWidth: 76,
      alignItems: 'center',
    },
    quickIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    quickLabel: {
      color: t.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
