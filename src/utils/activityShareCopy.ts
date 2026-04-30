import type { components } from '@/api/schema';
import { formatMiles, formatPace } from '@/utils/format';

type Activity = components['schemas']['Activity'];

export function buildActivityShareMessage(activity: Activity): string {
  const mi = activity.distance_miles;
  if (mi != null && Number(mi) > 0) {
    const n = Number(Number(mi).toFixed(2));
    const unit = n === 1 ? 'mile' : 'miles';
    return `Check out this ${n} ${unit} run on Run Club!`;
  }
  return 'Check out this run on Run Club!';
}

export function activityShareStatsLine(activity: Activity): string {
  const parts: string[] = [];
  if (activity.distance_miles != null && Number(activity.distance_miles) > 0) {
    parts.push(formatMiles(activity.distance_miles));
  }
  const pace =
    activity.avg_pace_display ??
    (activity.avg_pace_secs_per_mile != null
      ? formatPace(activity.avg_pace_secs_per_mile)
      : null);
  if (pace) parts.push(pace);
  return parts.length ? parts.join(' · ') : 'Run Club activity';
}
