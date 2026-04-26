import { Platform } from 'react-native';

/**
 * iOS: left-edge swipe to go back, using a full-width interactive pop gesture
 * (not only the thin default strip). See `fullScreenGestureEnabled` in native-stack.
 *
 * Android: native-stack does not use the same iOS edge swipe; the system back button
 * pops the stack (see CustomTabBar when the pill shows the back chevron).
 */
export const nativeStackBackGestureOptions =
  Platform.OS === 'ios'
    ? {
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }
    : {};
