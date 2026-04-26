import { Platform } from 'react-native';

/**
 * iOS: left-edge swipe to go back, using a full-width interactive pop gesture
 * (not only the thin default strip). See `fullScreenGestureEnabled` in native-stack.
 *
 * Android: stack screens rely on the system back button / predictive back; native-stack
 * does not expose the same edge swipe here.
 */
export const nativeStackBackGestureOptions =
  Platform.OS === 'ios'
    ? {
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }
    : {};
