import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { parseActivityUniversalLink } from '@/utils/shareLinks';

/**
 * Opens activity detail when the app is launched from a public share URL
 * ({@code https://<api>/api/public/activities/<id>}).
 */
export function UniversalActivityLinkHandler() {
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const id = parseActivityUniversalLink(url);
      if (id) {
        router.replace(`/(tabs)/activity/${id}`);
      }
    };

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  return null;
}
