import { cacheDirectory, downloadAsync } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/**
 * Downloads a map image and opens the native share sheet (Messages, Instagram, etc.).
 * Falls back to URL share if the sharing module is unavailable.
 */
export async function shareMapImageFromUrl(remoteUri: string, activityId: string): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) {
    throw new Error('No cache directory');
  }
  const safeName = `runclub-activity-map-${activityId}.jpg`;
  const dest = `${dir}${safeName}`;
  const { uri, status } = await downloadAsync(remoteUri, dest);
  if (status !== 200) {
    throw new Error('Could not download map image');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  } else {
    await Share.share({ url: remoteUri });
  }
}
