import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '@/utils/apiClient';

interface AuthState {
  user: any | null;
  jwt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; idToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  connectStrava: (code: string) => Promise<void>;
  skipStrava: () => void;
  restoreAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  jwt: null,
  isAuthenticated: false,
  isLoading: true,

  restoreAuth: async () => {
    try {
      const jwt = await SecureStore.getItemAsync('jwt');
      if (jwt) {
        set({ jwt, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Error restoring auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (tokens: { accessToken: string; idToken: string }) => {
    try {
      await SecureStore.setItemAsync('jwt', tokens.accessToken);
      set({ jwt: tokens.accessToken, isAuthenticated: true });
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('jwt');
      set({ user: null, jwt: null, isAuthenticated: false });
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  connectStrava: async (code: string) => {
    try {
      const response = await apiClient.post('/v1/strava/connect', { code });
      set({ user: response.data });
    } catch (error) {
      console.error('Error connecting Strava:', error);
      throw error;
    }
  },

  skipStrava: () => {
    // Just proceed without connecting Strava
  },
}));
