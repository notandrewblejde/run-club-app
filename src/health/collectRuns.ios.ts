import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import AppleHealthKit from 'react-native-health';
import type { CollectRunsOptions, UnifiedHealthRun } from '@/health/types';

function assertHealthKitUsable(): void {
  if (Constants.appOwnership === 'expo') {
    throw new Error(
      'Apple Health is not available in Expo Go. Run a native build instead: npx expo run:ios (then open that app, not Expo Go).',
    );
  }
  const workoutPerm = AppleHealthKit.Constants?.Permissions?.Workout;
  if (!workoutPerm || typeof AppleHealthKit.initHealthKit !== 'function') {
    throw new Error(
      'Apple Health native module is missing from this build. Install the Run Club app built with Xcode or EAS, not the store Expo Go client.',
    );
  }
}

function isLikelyRun(w: { activityName?: string }): boolean {
  const n = (w.activityName || '').toLowerCase();
  return n.includes('run') || n.includes('trail') || n.includes('virtual');
}

function initKit(): Promise<void> {
  const { Workout, WorkoutRoute } = AppleHealthKit.Constants.Permissions;
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(
      {
        permissions: {
          read: [Workout, WorkoutRoute],
          write: [],
        },
      },
      (err: string) => {
        if (err) reject(new Error(err));
        else resolve();
      },
    );
  });
}

function fetchWorkouts(start: Date, end: Date): Promise<Array<{ id: string; activityName?: string; distance: number; start: string; end: string; duration: number }>> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getAnchoredWorkouts(
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      (err: { message?: string } | string, results) => {
        if (err) {
          const msg = typeof err === 'string' ? err : err?.message ?? 'HealthKit workouts error';
          reject(new Error(msg));
          return;
        }
        resolve(results?.data ?? []);
      },
    );
  });
}

function fetchRoutePolyline(workoutId: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    AppleHealthKit.getWorkoutRouteSamples({ id: workoutId }, (err: string, results) => {
      if (err || !results?.data?.locations?.length) {
        resolve(undefined);
        return;
      }
      const locs = results.data.locations;
      if (locs.length < 2) {
        resolve(undefined);
        return;
      }
      resolve(polyline.encode(locs.map((l) => [l.latitude, l.longitude])));
    });
  });
}

/** Reads recent running workouts from Apple Health (includes Nike → Health). */
export default async function collectRunsForImport(options?: CollectRunsOptions): Promise<UnifiedHealthRun[]> {
  assertHealthKitUsable();
  await initKit();
  const lookbackDays = Math.min(365, Math.max(1, options?.lookbackDays ?? 90));
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - lookbackDays);

  const raw = await fetchWorkouts(start, end);
  const runs = raw.filter(isLikelyRun);

  const out: UnifiedHealthRun[] = [];
  for (const w of runs) {
    const ext = w.id;
    if (!ext) continue;
    const route = await fetchRoutePolyline(ext);
    const startMs = Date.parse(w.start);
    const endMs = Date.parse(w.end);
    const movingSecs =
      Number.isFinite(startMs) && Number.isFinite(endMs)
        ? Math.max(0, Math.round((endMs - startMs) / 1000))
        : Math.round(w.duration || 0);

    const distM = typeof w.distance === 'number' && w.distance > 0 ? w.distance : undefined;

    out.push({
      import_source: 'apple_health',
      external_id: ext,
      name: w.activityName?.trim() || 'Run',
      start_date_epoch_seconds: Math.floor(startMs / 1000),
      distance_meters: distM,
      moving_time_secs: movingSecs,
      map_polyline: route,
    });
  }
  return out.slice(0, 50);
}
