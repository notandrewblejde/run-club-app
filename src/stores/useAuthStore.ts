import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, unwrap } from '@/api/client';
import { qk, queryClient } from '@/api/queryClient';

/** Decode a JWT payload (no signature verification — purely for debug logging). */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=');
    // atob is available in RN's Hermes runtime.
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function logJwt(label: string, jwt: string) {
  if (!__DEV__) return;
  const payload = decodeJwtPayload(jwt);
  console.log(`[auth] ${label} jwt:`, jwt);
  console.log(`[auth] ${label} payload:`, JSON.stringify(payload, null, 2));
}

interface AuthState {
  jwt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; idToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  connectStrava: (code: string) => Promise<void>;
  skipStrava: () => void;
  restoreAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  isAuthenticated: false,
  isLoading: true,

  restoreAuth: async () => {
    try {
      const jwt = await SecureStore.getItemAsync('jwt');
      if (jwt) {
        logJwt('restored', jwt);
        // Trust a stored JWT even if the server is unreachable — only revoke
        // on an explicit 401. Otherwise users get logged out every time the
        // backend is down or they're offline.
        set({ jwt, isAuthenticated: true });
        try {
          const me = await unwrap(api.GET('/v1/users/me'));
          queryClient.setQueryData(qk.me(), me);
        } catch (e: unknown) {
          const status = (e as { status?: number } | undefined)?.status;
          if (status === 401) {
            await SecureStore.deleteItemAsync('jwt');
            set({ jwt: null, isAuthenticated: false });
          }
          // Network/5xx: keep the user signed in; queries will retry on demand.
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  login: async ({ accessToken }) => {
    logJwt('login', accessToken);
    await SecureStore.setItemAsync('jwt', accessToken);
    set({ jwt: accessToken, isAuthenticated: true });
    try {
      const me = await unwrap(api.GET('/v1/users/me'));
      queryClient.setQueryData(qk.me(), me);
    } catch (e) {
      console.warn('getMe after login failed', e);
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('jwt');
    queryClient.clear();
    set({ jwt: null, isAuthenticated: false });
  },

  connectStrava: async (code: string) => {
    await unwrap(api.GET('/v1/strava/callback', { params: { query: { code } } }));
    await queryClient.invalidateQueries({ queryKey: qk.me() });
  },

  skipStrava: () => {
    // No-op: user proceeds without Strava.
  },
}));
