/**
 * Copies text using expo-clipboard when the native module exists (dev/production builds).
 * Returns false in Expo Go or older binaries without ExpoClipboard — avoid static import
 * of expo-clipboard so activity screens still load.
 */
export async function copyStringToClipboard(text: string): Promise<boolean> {
  try {
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
