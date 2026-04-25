import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Globe, Lock } from 'lucide-react-native';
import type { components } from '@/api/schema';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type Club = components['schemas']['Club'];

interface ClubCardProps {
  club: Club;
  onPress?: () => void;
}

export function ClubCard({ club, onPress }: ClubCardProps) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const Icon = club.privacy_level === 'public' ? Globe : Lock;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{club.name}</Text>
          {club.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {club.description}
            </Text>
          ) : null}
        </View>
        {typeof club.member_count === 'number' ? (
          <View style={styles.memberCount}>
            <Users size={14} color={tokens.text} />
            <Text style={styles.count}>{club.member_count}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <Icon size={11} color={tokens.textMuted} />
        <Text style={styles.metaText}>{club.privacy_level}</Text>
        {club.viewer_role ? (
          <>
            <Text style={styles.metaText}>·</Text>
            <Text style={styles.metaText}>{club.viewer_role}</Text>
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    name: { color: t.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
    description: { color: t.textSecondary, fontSize: 12, maxWidth: 220 },
    memberCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    count: { color: t.text, fontSize: 12, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: t.textMuted, fontSize: 12 },
  });
}
