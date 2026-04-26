import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

/**
 * Minimum user shape needed to render a row. Matches `components.schemas.User`
 * but kept structural so Follow{er,ee} sub-types and search hits all fit.
 */
export interface UserRowUser {
  id: string;
  name?: string;
  avatar_url?: string;
}

interface Props {
  user: UserRowUser;
  /** Optional second line under the name (e.g. role, city, follower count). */
  subtitle?: string;
  /** Right-side slot — typically an action button (Follow, Invite, Accept). */
  right?: React.ReactNode;
  /** Override the default tap behavior (which routes to the user's profile). */
  onPress?: () => void;
}

/**
 * Shared row for "an avatar + name + optional action". Replaces the three
 * near-identical implementations in discover, clubs/[id]/invite, and
 * profile/requests.
 */
export function UserRow({ user, subtitle, right, onPress }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const handlePress = onPress ?? (() => router.push(`/(tabs)/users/${user.id}`));
  const initial = (user.name ?? '?').slice(0, 1).toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.85}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name ?? 'Unnamed'}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.surface,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarFallback: {
      backgroundColor: t.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700' },
    body: { flex: 1, minWidth: 0 },
    name: { color: t.text, fontWeight: '600' },
    subtitle: { color: t.textMuted, fontSize: 12, marginTop: 2 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  });
}
