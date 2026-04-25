import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '';
const redirectUri = 'runclub://strava-callback';

/**
 * Strava connect surface, shown after Auth0 login (optional) and from the
 * Profile screen for users who skipped initially. Uses the bottom action bar
 * for "Connect Strava" / "Skip" so navigation chrome stays consistent across
 * detail screens.
 */
export default function StravaConnectScreen() {
  const connectStrava = useAuthStore((s) => s.connectStrava);
  const { setActions, clearActions } = useBottomBarActions();
  const [exchanging, setExchanging] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['activity:read_all'],
      redirectUri,
    },
    { authorizationEndpoint: 'https://www.strava.com/oauth/authorize' },
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      void handleCallback(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const handleCallback = async (code: string) => {
    setExchanging(true);
    try {
      await connectStrava(code);
      router.replace('/(tabs)/feed');
    } catch (e) {
      console.warn('Strava connect failed', e);
    } finally {
      setExchanging(false);
    }
  };

  // Wire the connect / skip buttons into the bottom action bar.
  useEffect(() => {
    setActions([
      {
        label: 'Skip',
        onPress: () => router.replace('/(tabs)/feed'),
        variant: 'outlined',
      },
      {
        label: 'Connect',
        onPress: () => promptAsync(),
        loading: exchanging,
        disabled: !request || exchanging,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, exchanging]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.title}>Connect Strava</Text>
        <Text style={styles.subtitle}>
          Sync your runs automatically. We'll backfill your recent activities and keep them
          up to date as you go.
        </Text>

        <View style={styles.bullets}>
          <Bullet text="Auto-import runs after every workout" />
          <Bullet text="Maps, pace, heart-rate, and elevation" />
          <Bullet text="Disconnect anytime from your profile" />
        </View>
      </View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    alignItems: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FC4C02',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 32,
  },
  bullets: { alignSelf: 'stretch', gap: 12 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FC4C02',
  },
  bulletText: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
});
