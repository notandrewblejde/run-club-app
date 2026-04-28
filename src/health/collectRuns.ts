import { Platform } from 'react-native';
import type { CollectRunsOptions, UnifiedHealthRun } from '@/health/types';

/** Dispatches to HealthKit (iOS), Health Connect (Android), or empty (web). */
export default function collectRunsForImport(opts?: CollectRunsOptions): Promise<UnifiedHealthRun[]> {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./collectRuns.ios').default(opts);
  }
  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./collectRuns.android').default(opts);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./collectRuns.web').default(opts);
}
