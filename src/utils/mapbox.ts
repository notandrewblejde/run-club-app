import { Activity } from '@/types';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_USERNAME = 'mapbox';

export function generateStaticMapUrl(activity: Activity, width: number = 280, height: number = 120): string {
  if (!activity.route) return '';

  const { startLat, startLng, endLat, endLng } = activity.route;

  // Calculate center point and zoom
  const centerLat = (startLat + endLat) / 2;
  const centerLng = (startLng + endLng) / 2;

  // Estimate zoom based on distance between start and end
  const latDiff = Math.abs(endLat - startLat);
  const lngDiff = Math.abs(endLng - startLng);
  const maxDiff = Math.max(latDiff, lngDiff);
  let zoom = 13;

  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.05) zoom = 12;

  // Create route overlay with polyline
  const routePath = `${startLng},${startLat},${endLng},${endLat}`;

  // Build static images URL
  const url = `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/clt5nfx9l007a01qkc8gf2y4r/static/path-5+FF6B35-0.8(${encodeURIComponent(routePath)})/${centerLng},${centerLat},${zoom},0,0/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return url;
}

export function generateRoutePolyline(activity: Activity): string | null {
  if (!activity.route) return null;
  // This would normally use actual polyline data from the API
  // For now, we'll use a simple line between start and end
  const { startLat, startLng, endLat, endLng } = activity.route;
  return `${startLng},${startLat},${endLng},${endLat}`;
}
