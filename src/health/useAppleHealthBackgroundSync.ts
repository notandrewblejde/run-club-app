import { useCallback, useEffect, useRef } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, unwrap } from '@/api/client';
import { qk, queryClient } from '@/api/queryClient';
import collectRunsForImport from '@/health/collectRuns';
import { useAuthStore } from '@/stores/useAuthStore';

/** Emitted by react-native-health when HKObserverQuery sees new workout samples (requires native setup). */
const HEALTHKIT_WORKOUT_NEW = 'healthKit:Workout:new';

const DEBOUNCE_MS = 5000;
const AUTO_LOOKBACK_DAYS = 14;

/**
 * Subscribes to HealthKit workout updates and POSTs incremental imports while logged in.
 * Also runs a debounced sync when the app returns to foreground (covers missed background wakes).
 */
export function useAppleHealthBackgroundSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushIncremental = useCallback(async () => {
    try {
      const jwt = await SecureStore.getItemAsync('jwt');
      if (!jwt) return;
      const workouts = await collectRunsForImport({ lookbackDays: AUTO_LOOKBACK_DAYS });
      if (!workouts.length) return;
      await unwrap(api.POST('/v1/me/activities/health-import', { body: { workouts } }));
      void queryClient.invalidateQueries({ queryKey: qk.activities('me') });
      void queryClient.invalidateQueries({ queryKey: qk.activities('following') });
      void queryClient.invalidateQueries({ queryKey: qk.me() });
      void queryClient.invalidateQueries({ queryKey: ['club'] });
    } catch {
      // Background path: avoid surfacing noisy errors; manual import still shows alerts.
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void pushIncremental();
    }, DEBOUNCE_MS);
  }, [pushIncremental]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthenticated || isLoading) return;

    const { AppleHealthKit } = NativeModules;
    if (!AppleHealthKit) return;

    const emitter = new NativeEventEmitter(AppleHealthKit);
    const hkSub = emitter.addListener(HEALTHKIT_WORKOUT_NEW, scheduleSync);

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleSync();
    });

    scheduleSync();

    return () => {
      hkSub.remove();
      appSub.remove();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isAuthenticated, isLoading, scheduleSync]);
}
