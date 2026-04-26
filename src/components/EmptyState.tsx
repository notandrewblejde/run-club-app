import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

interface Props {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

/**
 * Centered title + body + optional pill CTA. Replaces the inline
 * `View + Text` empty states scattered across feed/clubs/etc., and gives
 * the "Following feed is empty" screen a path forward via the CTA.
 *
 * Pass only `title` and `body` for an info-only empty state; pass `ctaLabel`
 * + `onCtaPress` to render the action button.
 */
export function EmptyState({ title, body, ctaLabel, onCtaPress }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity
          style={styles.cta}
          onPress={onCtaPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 32,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: t.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    body: {
      fontSize: 13,
      color: t.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    cta: {
      marginTop: 20,
      backgroundColor: t.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
    },
    ctaLabel: { color: t.onPrimary, fontWeight: '600', fontSize: 14 },
  });
}
