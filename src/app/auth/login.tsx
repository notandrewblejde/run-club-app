import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import * as AuthSession from 'expo-auth-session';
import { Prompt } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Footprints } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'runclub.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';
const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || 'https://api.runclub.app';
const redirectUri = 'runclub://auth/callback';

const auth0AuthorizeDiscovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
} as const;

/** Soft “route” swoosh behind the wordmark (map / motion vibe). */
function RouteSwoosh({ width, color }: { width: number; color: string }) {
  const h = 120;
  const endX = Math.max(80, Math.min(width - 12, 520));
  const d =
    'M8 92 C 48 28, 88 18, 132 44 S 220 22, 268 56 S 340 8, 380 48 S 460 20, ' + endX + ' 64';
  return (
    <Svg width={width} height={h} style={{ marginBottom: -8 }}>
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.45}
      />
      <Circle cx={28} cy={88} r={5} fill={color} opacity={0.55} />
      <Circle cx={Math.min(width - 36, 500)} cy={58} r={5} fill={color} opacity={0.35} />
    </Svg>
  );
}

function AmbientBackdrop({
  width,
  height,
  accentBlue,
  accentOrange,
  baseBg,
}: {
  width: number;
  height: number;
  accentBlue: string;
  accentOrange: string;
  baseBg: string;
}) {
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="loginWash" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={accentBlue} stopOpacity={0.22} />
          <Stop offset="0.45" stopColor={accentOrange} stopOpacity={0.12} />
          <Stop offset="1" stopColor={baseBg} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="loginFloor" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={baseBg} stopOpacity={0} />
          <Stop offset="0.55" stopColor={accentBlue} stopOpacity={0.06} />
          <Stop offset="1" stopColor={accentOrange} stopOpacity={0.1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={baseBg} />
      <Rect x={0} y={0} width={width} height={height} fill="url(#loginWash)" />
      <Rect x={0} y={height * 0.35} width={width} height={height * 0.65} fill="url(#loginFloor)" />
      <Circle cx={width * 0.12} cy={height * 0.18} r={width * 0.42} fill={accentOrange} opacity={0.06} />
      <Circle cx={width * 0.92} cy={height * 0.28} r={width * 0.38} fill={accentBlue} opacity={0.07} />
    </Svg>
  );
}

export default function LoginScreen() {
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const drift = useRef(new Animated.Value(0)).current;

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
  const [reloginRequest, reloginResponse, promptReloginAsync] = AuthSession.useAuthRequest(
    { ...baseAuthConfig, prompt: Prompt.Login },
    auth0AuthorizeDiscovery
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const orbTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });
  const orbScale = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const handleAuthSuccess = useCallback(async (code: string, authRequest: AuthSession.AuthRequest | null) => {
    try {
      setLoading(true);
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          code,
          clientId: AUTH0_CLIENT_ID,
          redirectUri,
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

      router.replace('/(tabs)/onboarding');
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

  const blurTint: 'light' | 'dark' | 'default' = isDark ? 'dark' : 'light';

  const cardBody = (
    <>
      {loading ? (
        <ActivityIndicator size="large" color={tokens.accentBlue} style={styles.loader} />
      ) : (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => void promptAsync()}
            disabled={!request}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Continue with Auth0</Text>
          </TouchableOpacity>
          <Pressable
            onPress={() => void promptReloginAsync()}
            disabled={!reloginRequest}
            style={({ pressed }) => [styles.altPressable, pressed && { opacity: 0.65 }]}
          >
            <Text style={styles.altText}>Use a different account</Text>
          </Pressable>
        </>
      )}
    </>
  );

  return (
    <View style={styles.root}>
      <AmbientBackdrop
        width={winW}
        height={Math.max(winH, 640)}
        accentBlue={tokens.accentBlue}
        accentOrange={tokens.accentOrange}
        baseBg={tokens.background}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            backgroundColor: tokens.accentBlue,
            transform: [{ translateY: orbTranslate }, { scale: orbScale }],
          },
        ]}
      />

      <View style={[styles.safe, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.hero}>
          <View style={[styles.badge, { borderColor: tokens.accentOrange + '55' }]}>
            <Footprints size={28} color={tokens.accentOrange} strokeWidth={2.2} />
          </View>
          <RouteSwoosh width={Math.min(winW - 48, 420)} color={tokens.accentOrange} />
          <Text style={styles.kicker}>Welcome</Text>
          <Text style={styles.title}>Run Club</Text>
          <Text style={styles.subtitle}>Train together. Share every mile.</Text>
        </View>

        <View style={styles.cardWrap}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={isDark ? 28 : 52} tint={blurTint} style={styles.cardBlur}>
              <View style={[styles.cardInner, { borderColor: tokens.border }]}>{cardBody}</View>
            </BlurView>
          ) : (
            <View style={[styles.cardAndroid, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}>
              <View style={styles.cardInner}>{cardBody}</View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.background,
    },
    safe: {
      flex: 1,
      justifyContent: 'space-between',
    },
    orb: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      opacity: 0.11,
      top: '18%',
      alignSelf: 'center',
    },
    hero: {
      alignItems: 'center',
      paddingHorizontal: 28,
      marginTop: 8,
    },
    badge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      borderWidth: StyleSheet.hairlineWidth * 2,
      backgroundColor: t.surfaceElevated,
    },
    swooshSvg: { marginBottom: -8 },
    kicker: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.textMuted,
      marginBottom: 6,
    },
    title: {
      fontSize: 42,
      fontWeight: '800',
      letterSpacing: -1.2,
      color: t.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 17,
      lineHeight: 24,
      color: t.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
    cardWrap: {
      paddingHorizontal: 20,
    },
    cardBlur: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    cardAndroid: {
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    cardInner: {
      paddingVertical: 22,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor:
        Platform.OS === 'ios'
          ? t.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.5)'
          : 'transparent',
    },
    primaryBtn: {
      backgroundColor: t.accentBlue,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 6,
      shadowColor: t.accentBlue,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 4,
    },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    altPressable: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    altText: {
      color: t.accentBlue,
      fontSize: 15,
      fontWeight: '600',
    },
    loader: { marginVertical: 24 },
  });
}
