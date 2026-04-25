import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '';
const redirectUri = 'runclub://strava-callback';

export default function StravaConnectScreen() {
  const connectStrava = useAuthStore((state) => state.connectStrava);
  const skipStrava = useAuthStore((state) => state.skipStrava);
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['activity:read_all'],
      redirectUri,
    },
    { authorizationEndpoint: 'https://www.strava.com/api/v3/oauth/authorize' }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleStravaConnect(code);
    }
  }, [response]);

  const handleStravaConnect = async (code: string) => {
    try {
      setLoading(true);
      await connectStrava(code);
      router.replace('/(tabs)/feed');
    } catch (error) {
      console.error('Strava connect error:', error);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    skipStrava();
    router.replace('/(tabs)/feed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Connect Strava</Text>
        <Text style={styles.subtitle}>Sync your running activities</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#FC4C02" style={styles.loader} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.stravaButton}
              onPress={() => promptAsync()}
              disabled={!request}
            >
              <Text style={styles.buttonText}>Connect with Strava</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
  },
  stravaButton: {
    backgroundColor: '#FC4C02',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  loader: {
    marginVertical: 20,
  },
});
