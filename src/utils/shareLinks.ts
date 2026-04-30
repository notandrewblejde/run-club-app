/** Canonical HTTPS activity preview (Open Graph); same path the API serves under context-path `/api`. */
export function activityPublicShareUrl(activityId: string): string {
  const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
  return `${base}/public/activities/${activityId}`;
}

/** Parses universal link / web URL into activity UUID, or null. */
export function parseActivityUniversalLink(url: string): string | null {
  const m = url.match(/\/api\/public\/activities\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : null;
}
