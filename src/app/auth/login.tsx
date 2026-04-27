import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import * as AuthSession from 'expo-auth-session';
import { Prompt } from 'expo-auth-session';
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

const auth0AuthorizeDiscovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
} as const;

export default function LoginScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const baseAuthConfig = useMemo(
    () => ({
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      extraParams: { audience: AUTH0_AUDIENCE },
    }),
    []
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(baseAuthConfig, auth0AuthorizeDiscovery);
  /** Forces Universal Login again so users can pick another Auth0 identity / connection. */
  const [reloginRequest, reloginResponse, promptReloginAsync] = AuthSession.useAuthRequest(
    { ...baseAuthConfig, prompt: Prompt.Login },
    auth0AuthorizeDiscovery
  );

  const handleAuthSuccess = useCallback(async (code: string, authRequest: AuthSession.AuthRequest | null) => {
    try {
      setLoading(true);
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code,
          clientId: AUTH0_CLIENT_ID,
          redirectUri,
          // PKCE: useAuthRequest sent a code_challenge derived from this verifier;
          // Auth0 rejects the exchange if we don't echo it back.
          extraParams: authRequest?.codeVerifier
            ? { code_verifier: authRequest.codeVerifier }
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
  }, [login]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      void handleAuthSuccess(code, request);
    }
  }, [response, request, handleAuthSuccess]);

  useEffect(() => {
    if (reloginResponse?.type === 'success') {
      const { code } = reloginResponse.params;
      void handleAuthSuccess(code, reloginRequest);
    }
  }, [reloginResponse, reloginRequest, handleAuthSuccess]);

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
              onPress={() => void promptAsync()}
              disabled={!request}
            >
              <Text style={styles.primaryButtonText}>Continue with Auth0</Text>
            </TouchableOpacity>
            <Pressable
              onPress={() => void promptReloginAsync()}
              disabled={!reloginRequest}
              style={({ pressed }) => [styles.altAccountPressable, pressed && styles.altAccountPressed]}
            >
              <Text style={styles.altAccountText}>Use a different account</Text>
            </Pressable>
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
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    altAccountPressable: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignSelf: 'center',
    },
    altAccountPressed: { opacity: 0.65 },
    altAccountText: {
      color: t.accentBlue,
      fontSize: 15,
      fontWeight: '500',
      textDecorationLine: 'underline',
    },
    loader: { marginVertical: 20 },
  });
}
