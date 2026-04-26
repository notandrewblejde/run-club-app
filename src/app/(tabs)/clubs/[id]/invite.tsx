import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, UserPlus } from 'lucide-react-native';
import { useInviteMember, useUserSearch } from '@/api/hooks';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function InviteMemberScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const [query, setQuery] = useState('');
  const search = useUserSearch(query);
  const invite = useInviteMember(clubId ?? '');

  if (!clubId) return null;
  const results = search.data?.data ?? [];

  const handleInvite = async (userId: string, name?: string) => {
    try {
      await invite.mutateAsync(userId);
      Alert.alert('Invited', `${name ?? 'User'} has been added to the club.`);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not invite', (e as Error)?.message ?? 'Try again later');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invite member</Text>
        <View style={styles.searchBox}>
          <Search size={16} color={tokens.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or email"
            placeholderTextColor={tokens.placeholder}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {query.trim().length < 2 ? (
        <Text style={styles.hint}>Type at least 2 characters to search.</Text>
      ) : search.isFetching ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 24 }} />
      ) : results.length === 0 ? (
        <Text style={styles.hint}>No matches.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>
                    {(item.name ?? '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{item.name ?? 'Unnamed'}</Text>
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => handleInvite(item.id, item.name)}
                disabled={invite.isPending}
              >
                <UserPlus size={14} color={tokens.onPrimary} />
                <Text style={styles.inviteLabel}>Invite</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22, marginBottom: 12 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.surfaceElevated,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    searchInput: { flex: 1, color: t.text, fontSize: 14 },
    hint: { color: t.textMuted, paddingHorizontal: 20, marginTop: 24 },
    list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 },
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
    name: { color: t.text, fontWeight: '600', flex: 1 },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    inviteLabel: { color: t.onPrimary, fontWeight: '600', fontSize: 13 },
  });
}
