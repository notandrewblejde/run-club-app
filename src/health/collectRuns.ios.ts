import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import AppleHealthKit from 'react-native-health';
import type { CollectRunsOptions, UnifiedHealthRun } from '@/health/types';

/** react-native-health returns workout distance in miles (HKUnit mileUnit in native code). */
const METERS_PER_MILE = 1609.344;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** GPS path length when HealthKit totalDistance is missing (Strava/Nike sometimes omit it on the HK sample). */
function routeLengthMetersFromEncoded(encoded: string | undefined): number | undefined {
  if (!encoded) return undefined;
  try {
    const coords = polyline.decode(encoded) as [number, number][];
    if (coords.length < 2) return undefined;
    let meters = 0;
    for (let i = 1; i < coords.length; i++) {
      meters += haversineMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    }
    return meters > 0 ? meters : undefined;
  } catch {
    return undefined;
  }
}

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

    let distM: number | undefined;
    if (typeof w.distance === 'number' && w.distance > 0) {
      distM = w.distance * METERS_PER_MILE;
    }
    if (distM == null || distM <= 0) {
      const fromRoute = routeLengthMetersFromEncoded(route);
      if (fromRoute != null && fromRoute > 0) {
        distM = fromRoute;
      }
    }

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
