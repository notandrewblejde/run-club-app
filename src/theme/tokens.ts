/**
 * Color tokens for light + dark themes.
 *
 * Goal: every screen consumes named tokens (e.g. `tokens.surface`) so a single
 * preference flip swaps the whole UI. Strava-adjacent warmth uses `accentOrange`
 * (e.g. kudos); coach / global AI use `aiAccent` (blue, distinct from Strava).
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  mode: ThemeMode;

  // Surfaces (page → cards → inputs → modal sheets).
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSheet: string;

  // Borders + dividers.
  border: string;
  divider: string;

  // Text.
  text: string;
  textSecondary: string;
  textMuted: string;

  // Inputs / placeholders.
  placeholder: string;

  // Brand accents — same in both modes.
  accentBlue: string;
  /** Coach + global AI Coach (headers, CTAs, summaries) — blue, not Strava orange. */
  aiAccent: string;
  accentOrange: string;
  accentYellow: string;
  stravaOrange: string;

  // Primary CTA: white-on-dark or dark-on-light depending on mode.
  primary: string;
  onPrimary: string;

  // Status.
  errorBg: string;
  error: string;
  success: string;

  // Nav chrome.
  navPill: string;
  navPillBorder: string;
  navIconActive: string;
  navIconInactive: string;

  // Map style id used with Mapbox static images.
  mapStyle: 'dark-v11' | 'light-v11';
  mapPathColor: string; // hex without '#', for the static map URL

  // Status bar style hint.
  statusBarStyle: 'light' | 'dark';
}

export const darkTokens: ThemeTokens = {
  mode: 'dark',

  background: '#0F0F0F',
  surface: '#111111',
  surfaceElevated: '#161618',
  surfaceSheet: '#1c1c1e',

  border: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.06)',

  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.45)',

  placeholder: 'rgba(255,255,255,0.38)',

  accentBlue: '#00A3E0',
  aiAccent: '#00A3E0',
  accentOrange: '#FF6B35',
  accentYellow: '#FFD24A',
  stravaOrange: '#FC4C02',

  primary: '#ffffff',
  onPrimary: '#0F0F0F',

  errorBg: '#5b1212',
  error: '#FF6B6B',
  success: '#34D399',

  navPill: 'rgba(28,28,30,0.94)',
  navPillBorder: 'rgba(255,255,255,0.08)',
  navIconActive: '#ffffff',
  navIconInactive: 'rgba(255,255,255,0.45)',

  mapStyle: 'dark-v11',
  mapPathColor: 'FF6B35',

  statusBarStyle: 'light',
};

export const lightTokens: ThemeTokens = {
  mode: 'light',

  background: '#fafafa',
  surface: '#ffffff',
  surfaceElevated: '#f3f3f5',
  surfaceSheet: '#ffffff',

  border: 'rgba(0,0,0,0.08)',
  divider: 'rgba(0,0,0,0.06)',

  text: '#0F0F0F',
  textSecondary: 'rgba(15,15,15,0.72)',
  textMuted: 'rgba(15,15,15,0.45)',

  placeholder: 'rgba(15,15,15,0.38)',

  accentBlue: '#0095CC',
  aiAccent: '#0095CC',
  accentOrange: '#FF6B35',
  accentYellow: '#E6B800',
  stravaOrange: '#FC4C02',

  primary: '#0F0F0F',
  onPrimary: '#ffffff',

  errorBg: '#FFE5E5',
  error: '#D8000C',
  success: '#0E8A4F',

  navPill: 'rgba(255,255,255,0.96)',
  navPillBorder: 'rgba(0,0,0,0.08)',
  navIconActive: '#0F0F0F',
  navIconInactive: 'rgba(15,15,15,0.45)',

  mapStyle: 'light-v11',
  mapPathColor: 'FF6B35',

  statusBarStyle: 'dark',
};

export function tokensFor(mode: ThemeMode): ThemeTokens {
  return mode === 'dark' ? darkTokens : lightTokens;
}
