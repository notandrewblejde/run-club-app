import polyline from '@mapbox/polyline';
import {
  ExerciseType,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import type { CollectRunsOptions, UnifiedHealthRun } from '@/health/types';

/** Reads recent running sessions from Google Health Connect (incl. Nike on Android when synced there). */
export default async function collectRunsForImport(options?: CollectRunsOptions): Promise<UnifiedHealthRun[]> {
  const ok = await initialize();
  if (!ok) return [];

  await requestPermission([{ accessType: 'read', recordType: 'ExerciseSession' }]);

  const lookbackDays = Math.min(365, Math.max(1, options?.lookbackDays ?? 90));
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - lookbackDays);

  const { records } = await readRecords('ExerciseSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });

  const out: UnifiedHealthRun[] = [];
  for (const r of records) {
    if (
      r.exerciseType !== ExerciseType.RUNNING &&
      r.exerciseType !== ExerciseType.RUNNING_TREADMILL
    ) {
      continue;
    }
    const ext = r.metadata?.id;
    if (!ext) continue;

    let map_polyline: string | undefined;
    const route = r.exerciseRoute?.route;
    if (route && route.length >= 2) {
      map_polyline = polyline.encode(route.map((p) => [p.latitude, p.longitude]));
    }

    const startMs = Date.parse(r.startTime);
    const endMs = Date.parse(r.endTime);
    const movingSecs =
      Number.isFinite(startMs) && Number.isFinite(endMs)
        ? Math.max(0, Math.round((endMs - startMs) / 1000))
        : 0;

    out.push({
      import_source: 'health_connect',
      external_id: ext,
      name: (r.title && r.title.trim()) || 'Run',
      start_date_epoch_seconds: Math.floor(startMs / 1000),
      moving_time_secs: movingSecs,
      map_polyline,
    });
  }
  return out.slice(0, 50);
}
