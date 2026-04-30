import { useState } from 'react';
import { TouchableOpacity, Alert, Share, type StyleProp, type ViewStyle } from 'react-native';
import { Share2 } from 'lucide-react-native';
import type { components } from '@/api/schema';
import { activityPublicShareUrl } from '@/utils/shareLinks';
import { shareMapImageFromUrl } from '@/utils/shareActivityMap';
import { copyStringToClipboard } from '@/utils/copyToClipboard';
import { buildActivityShareMessage, activityShareStatsLine } from '@/utils/activityShareCopy';
import { useTheme } from '@/theme/ThemeContext';
import { ActivityShareSheet } from '@/components/activity/ActivityShareSheet';

type Activity = components['schemas']['Activity'];

type Props = {
  activity: Activity;
  mapUrl: string | null;
  clubs: { id: string; name: string }[];
  onOpenClubModal: () => void;
  iconSize?: number;
  /** Merged into the share icon touchable (e.g. headerIconBtn). */
  style?: StyleProp<ViewStyle>;
};

export function ActivityShareTrigger({
  activity,
  mapUrl,
  clubs,
  onOpenClubModal,
  iconSize = 20,
  style,
}: Props) {
  const { tokens } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const shareUrl = activityPublicShareUrl(activity.id);
  const previewOk = activity.share_preview_available === true;
  const shareHeadline = buildActivityShareMessage(activity);
  const shareStats = activityShareStatsLine(activity);

  const warnPrivateProfile = (then: () => void) => {
    if (previewOk) {
      then();
      return;
    }
    Alert.alert(
      'Public link unavailable',
      'Set your profile to public in Settings to share a preview link that works in Messages and other apps.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue anyway', onPress: then },
      ],
    );
  };

  const performClipboardCopy = async (): Promise<boolean> => {
    const ok = await copyStringToClipboard(shareUrl);
    if (!ok) {
      Alert.alert(
        'Copy unavailable',
        'This build does not include the clipboard module (try a dev build), or use Share via… to send the link.',
      );
    }
    return ok;
  };

  const copyLink = (): Promise<boolean> => {
    if (previewOk) {
      return performClipboardCopy();
    }
    return new Promise((resolve) => {
      Alert.alert(
        'Public link unavailable',
        'Set your profile to public in Settings to share a preview link that works in Messages and other apps.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Continue anyway',
            onPress: () => {
              void performClipboardCopy().then(resolve);
            },
          },
        ],
      );
    });
  };

  const systemShare = () => {
    warnPrivateProfile(async () => {
      try {
        const shareMessage = buildActivityShareMessage(activity);
        await Share.share({
          url: shareUrl,
          message: shareMessage,
          title: shareMessage,
        });
      } catch (e) {
        Alert.alert('Share failed', (e as Error)?.message ?? 'Unknown error');
      }
    });
  };

  const shareMap = () => {
    if (!mapUrl) return;
    void (async () => {
      try {
        await shareMapImageFromUrl(mapUrl, activity.id);
      } catch (e) {
        Alert.alert('Could not share map', (e as Error)?.message ?? 'Unknown error');
      }
    })();
  };

  const openShareToClub = () => {
    if (!clubs.length) {
      Alert.alert('No clubs yet', 'Join a club from the Clubs tab to share your run there.');
      return;
    }
    onOpenClubModal();
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setSheetOpen(true)}
        hitSlop={12}
        style={[{ padding: 4 }, style]}
        accessibilityRole="button"
        accessibilityLabel="Share activity"
      >
        <Share2 size={iconSize} color={tokens.textSecondary} />
      </TouchableOpacity>
      <ActivityShareSheet
        visible={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
        mapUrl={mapUrl}
        headline={shareHeadline}
        statsLine={shareStats}
        shareUrl={shareUrl}
        tokens={tokens}
        onCopyLink={() => copyLink()}
        onSystemShare={() => systemShare()}
        onShareMapImage={mapUrl ? () => shareMap() : null}
        onShareToClub={() => openShareToClub()}
      />
    </>
  );
}
