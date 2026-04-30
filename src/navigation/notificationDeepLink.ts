import { router } from 'expo-router';

/** Expo push `data` uses string values. */
export type PushNotificationData = Record<string, unknown>;

function activityHref(activityId: string, commentId?: string): `/(tabs)/activity/${string}` {
  const q = commentId ? `?commentId=${encodeURIComponent(commentId)}` : '';
  return `/(tabs)/activity/${activityId}${q}`;
}

/** Navigate from in-app notification row or push payload (activity + optional comment). */
export function openActivityNotificationTarget(
  activityId: string,
  opts?: { commentId?: string | null }
) {
  const cid = opts?.commentId?.trim();
  router.push(activityHref(activityId, cid || undefined), { withAnchor: true });
}

/** Handle push-only types that carry `activityId` in `data`. */
export function openFromPushData(data: PushNotificationData | undefined | null) {
  if (!data) return;
  const type = String(data.type ?? '');
  const activityId = data.activityId != null ? String(data.activityId) : '';
  if (!activityId) return;

  if (type === 'ACTIVITY_COMMENT') {
    const commentId = data.commentId != null ? String(data.commentId) : '';
    openActivityNotificationTarget(activityId, { commentId: commentId || undefined });
    return;
  }
  if (type === 'CLUB_ACTIVITY') {
    openActivityNotificationTarget(activityId);
  }
}
