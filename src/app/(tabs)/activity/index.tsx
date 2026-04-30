import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import FeedScreen from '../feed/index';

/**
 * Hidden base route for the activity tab stack. Detail screens are pushed on top
 * with `withAnchor: true` so iOS can interactive-pop. That gesture reveals this
 * screen underneath — it must render real feed UI (not only `<Redirect />`), or
 * users see a blank frame during the transition. Once this route becomes focused
 * after a pop, we align URL/tab state with the feed tab.
 */
export default function ActivityTabIndex() {
  useFocusEffect(
    useCallback(() => {
      router.replace('/(tabs)/feed');
    }, [])
  );

  return <FeedScreen />;
}
