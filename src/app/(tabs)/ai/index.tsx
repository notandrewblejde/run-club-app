import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFeed, useActivitySummary } from '@/api/hooks';
import { formatMiles, formatRelativeFromUnix } from '@/utils/format';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

export default function AiCoachScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const feedQ = useFeed('me');
  const recent = feedQ.data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const summaryQ = useActivitySummary(selectedId ?? undefined, { enabled: !!selectedId });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sparkles size={18} color={tokens.accentOrange} />
          <Text style={styles.headerText}>AI Coach</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Pick a recent run and I'll give you a quick coaching takeaway.
        </Text>

        {feedQ.isLoading ? (
          <ActivityIndicator color={tokens.accentOrange} style={{ marginTop: 24 }} />
        ) : recent.length === 0 ? (
          <Text style={styles.empty}>
            No recent runs yet. Connect Strava and head out for a run — I'll have feedback
            ready when you get back.
          </Text>
        ) : (
          recent.slice(0, 10).map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.runRow, selectedId === a.id && styles.runRowSelected]}
              onPress={() => setSelectedId(a.id)}
            >
              <View>
                <Text style={styles.runName} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.runMeta}>
                  {formatMiles(a.distance_miles)} · {formatRelativeFromUnix(a.start_date)}
                </Text>
              </View>
              <Sparkles size={16} color={tokens.accentOrange} />
            </TouchableOpacity>
          ))
        )}

        {selectedId ? (
          <View style={styles.summaryCard}>
            {summaryQ.isLoading ? (
              <ActivityIndicator color={tokens.accentOrange} />
            ) : (
              <Text style={styles.summaryText}>
                {summaryQ.data?.summary ?? summaryQ.error?.message ?? 'No summary available.'}
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
    },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerText: { color: t.text, fontWeight: '600', fontSize: 16 },
    scroll: { paddingHorizontal: 20, paddingBottom: 140 },
    intro: { color: t.textSecondary, fontSize: 14, marginBottom: 20 },
    empty: { color: t.textMuted, fontSize: 14, marginTop: 20, lineHeight: 20 },
    runRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    runRowSelected: { borderColor: t.accentOrange },
    runName: { color: t.text, fontWeight: '600', marginBottom: 2 },
    runMeta: { color: t.textMuted, fontSize: 12 },
    summaryCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.accentOrange,
    },
    summaryText: { color: t.text, fontSize: 14, lineHeight: 20 },
  });
}
