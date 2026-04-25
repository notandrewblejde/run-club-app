import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, unwrap } from '@/api/client';
import { qk, queryClient } from '@/api/queryClient';

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
        set({ jwt, isAuthenticated: true });
        // Warm the cache with the current user; if the token is stale the
        // 401 interceptor will clear it on the next call.
        try {
          const me = await unwrap(api.GET('/v1/users/me'));
          queryClient.setQueryData(qk.me(), me);
        } catch {
          await SecureStore.deleteItemAsync('jwt');
          set({ jwt: null, isAuthenticated: false });
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },

  login: async ({ accessToken }) => {
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
