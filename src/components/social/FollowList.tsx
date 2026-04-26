import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Follow = components['schemas']['Follow'];

interface Props {
  title: string;
  isLoading: boolean;
  data: Follow[];
  emptyText: string;
}

export function FollowList({ title, isLoading, data, emptyText }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : data.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user?.id ?? `${item.follower_id}-${item.following_id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => item.user?.id && router.push(`/(tabs)/users/${item.user.id}`)}
            >
              {item.user?.avatar_url ? (
                <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>
                    {(item.user?.name ?? '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{item.user?.name ?? 'Unnamed'}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    title: { color: t.text, fontWeight: '700', fontSize: 22 },
    empty: { color: t.textMuted, paddingHorizontal: 20, marginTop: 24 },
    list: { paddingHorizontal: 16, paddingBottom: 140 },
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
    name: { color: t.text, fontWeight: '600' },
  });
}
