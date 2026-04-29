/** Optional window for reading workouts from device health (manual import defaults to 90d). */
export type CollectRunsOptions = {
  lookbackDays?: number;
};

/** Matches API {@code HealthWorkoutImportItem.import_source}. */
export type HealthImportSource = 'apple_health' | 'health_connect';

/** Normalized run for POST /v1/me/activities/health-import. */
export interface UnifiedHealthRun {
  import_source: HealthImportSource;
  external_id: string;
  name: string;
  start_date_epoch_seconds: number;
  distance_meters?: number;
  moving_time_secs?: number;
  map_polyline?: string;
  /** Positive vertical gain (feet), from GPS altitudes when HealthKit exposes them. */
  elevation_gain_ft?: number;
  avg_heart_rate_bpm?: number;
  max_heart_rate_bpm?: number;
}
