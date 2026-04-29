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
  const { Workout, WorkoutRoute, HeartRate } = AppleHealthKit.Constants.Permissions;
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(
      {
        permissions: {
          read: [Workout, WorkoutRoute, HeartRate],
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

const METERS_TO_FEET = 3.28084;

/** Sum positive altitude deltas along the route (meters → feet). Filters invalid CLLocation altitudes. */
function elevationGainFtFromLocations(
  locs: { latitude: number; longitude: number; altitude?: number }[],
): number | undefined {
  const alts = locs
    .map((l) => l.altitude)
    .filter((a) => typeof a === 'number' && Number.isFinite(a) && a > -200 && a < 10000);
  if (alts.length < 2) return undefined;
  let gainM = 0;
  for (let i = 1; i < alts.length; i++) {
    const d = alts[i] - alts[i - 1];
    if (d > 0.5) gainM += d;
  }
  if (gainM < 1) return undefined;
  return gainM * METERS_TO_FEET;
}

function fetchRoutePolylineAndElevation(
  workoutId: string,
): Promise<{ polyline?: string; elevationGainFt?: number }> {
  return new Promise((resolve) => {
    AppleHealthKit.getWorkoutRouteSamples({ id: workoutId }, (err: string, results) => {
      if (err || !results?.data?.locations?.length) {
        resolve({});
        return;
      }
      const locs = results.data.locations;
      if (locs.length < 2) {
        resolve({});
        return;
      }
      resolve({
        polyline: polyline.encode(locs.map((l) => [l.latitude, l.longitude])),
        elevationGainFt: elevationGainFtFromLocations(locs),
      });
    });
  });
}

function fetchHeartRateStats(
  workoutStartIso: string,
  workoutEndIso: string,
): Promise<{ avg?: number; max?: number }> {
  return new Promise((resolve) => {
    if (!workoutStartIso || !workoutEndIso) {
      resolve({});
      return;
    }
    AppleHealthKit.getHeartRateSamples(
      {
        startDate: workoutStartIso,
        endDate: workoutEndIso,
        limit: 8000,
        ascending: true,
      },
      (err: string, results: { value?: number }[]) => {
        if (err || !Array.isArray(results) || results.length === 0) {
          resolve({});
          return;
        }
        const values = results
          .map((r) => r.value)
          .filter((v): v is number => typeof v === 'number' && v > 35 && v < 230);
        if (!values.length) {
          resolve({});
          return;
        }
        const sum = values.reduce((a, b) => a + b, 0);
        resolve({
          avg: Math.round(sum / values.length),
          max: Math.round(Math.max(...values)),
        });
      },
    );
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
    const [{ polyline: route, elevationGainFt }, hr] = await Promise.all([
      fetchRoutePolylineAndElevation(ext),
      fetchHeartRateStats(w.start, w.end),
    ]);
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

    const row: UnifiedHealthRun = {
      import_source: 'apple_health',
      external_id: ext,
      name: w.activityName?.trim() || 'Run',
      start_date_epoch_seconds: Math.floor(startMs / 1000),
      distance_meters: distM,
      moving_time_secs: movingSecs,
      map_polyline: route,
    };
    if (elevationGainFt != null && elevationGainFt > 0) {
      row.elevation_gain_ft = Math.round(elevationGainFt * 10) / 10;
    }
    if (hr.avg != null) row.avg_heart_rate_bpm = hr.avg;
    if (hr.max != null) row.max_heart_rate_bpm = hr.max;
    out.push(row);
  }
  return out.slice(0, 50);
}
