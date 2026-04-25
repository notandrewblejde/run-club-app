const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_USERNAME = 'mapbox';
const MAPBOX_STYLE = 'dark-v11';

/**
 * Builds a Mapbox static-image URL for a Google-encoded polyline.
 * Returns null when there's no route data or no token.
 */
export function generateStaticMapUrl(
  encoded: string | null | undefined,
  width = 600,
  height = 280,
): string | null {
  if (!encoded || !MAPBOX_ACCESS_TOKEN) return null;
  const pathOverlay = `path-4+FF6B35-0.9(${encodeURIComponent(encoded)})`;
  return `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/${MAPBOX_STYLE}/static/${pathOverlay}/auto/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}&padding=20`;
}
