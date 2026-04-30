import { cacheDirectory, downloadAsync } from 'expo-file-system';
import { Share } from 'react-native';

/**
 * Downloads a map image and opens the native share sheet (Messages, Instagram, etc.).
 * Uses expo-sharing when the native module is present (dev/production builds);
 * otherwise falls back to React Native Share with a local file or remote URL.
 */
export async function shareMapImageFromUrl(remoteUri: string, activityId: string): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) {
    await Share.share({ url: remoteUri });
    return;
  }
  const safeName = `runclub-activity-map-${activityId}.jpg`;
  const dest = `${dir}${safeName}`;
  const { uri, status } = await downloadAsync(remoteUri, dest);
  if (status !== 200) {
    throw new Error('Could not download map image');
  }

  try {
    // Avoid static import: Expo Go / older binaries may not ship ExpoSharing native code.
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
      return;
    }
  } catch {
    // Native module missing or share unavailable — fall through.
  }

  try {
    await Share.share({ url: uri, message: 'Shared from Run Club' });
  } catch {
    await Share.share({ url: remoteUri });
  }
}
