import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'runclub.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';
// API identifier registered in Auth0. Drives the `aud` claim on issued tokens
// so the backend can validate them as JWTs instead of opaque access tokens.
const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || 'https://api.runclub.app';
const redirectUri = 'runclub://auth/callback';

export default function LoginScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      extraParams: { audience: AUTH0_AUDIENCE },
    },
    { authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize` }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleAuthSuccess(code);
    }
  }, [response]);

  const handleAuthSuccess = async (code: string) => {
    try {
      setLoading(true);
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code,
          clientId: AUTH0_CLIENT_ID,
          redirectUri,
          // PKCE: useAuthRequest sent a code_challenge derived from this verifier;
          // Auth0 rejects the exchange if we don't echo it back.
          extraParams: request?.codeVerifier
            ? { code_verifier: request.codeVerifier }
            : undefined,
        },
        { tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token` }
      );

      await login({
        accessToken: tokenResponse.accessToken,
        idToken: tokenResponse.idToken || '',
      });

      router.replace('/(tabs)/strava-connect');
    } catch (error) {
      console.error('Auth error:', error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Run Club</Text>
        <Text style={styles.subtitle}>Social Running</Text>

        {loading ? (
          <ActivityIndicator size="large" color={tokens.accentBlue} style={styles.loader} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() => promptAsync()}
              disabled={!request}
            >
              <Text style={styles.primaryButtonText}>Continue with Auth0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      justifyContent: 'center',
    },
    content: { padding: 20, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: t.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: t.textSecondary, marginBottom: 40 },
    button: {
      backgroundColor: t.accentBlue,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
      marginBottom: 12,
      width: '100%',
      alignItems: 'center',
    },
    socialButton: {
      backgroundColor: t.surfaceElevated,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    socialButtonText: { color: t.text, fontSize: 16, fontWeight: '600' },
    loader: { marginVertical: 20 },
  });
}
