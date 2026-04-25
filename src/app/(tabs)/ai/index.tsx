import { useState } from 'react';
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

/**
 * AI coach surface — invoked from the floating agent pill.
 * MVP: lists the user's most recent runs and lets them request an AI
 * summary for any one of them (backed by /v1/activities/{id}/summary).
 */
export default function AiCoachScreen() {
  const feedQ = useFeed('me');
  const recent = feedQ.data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const summaryQ = useActivitySummary(selectedId ?? undefined, { enabled: !!selectedId });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Sparkles size={18} color="#FF6B35" />
          <Text style={styles.headerText}>AI Coach</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Pick a recent run and I'll give you a quick coaching takeaway.
        </Text>

        {feedQ.isLoading ? (
          <ActivityIndicator color="#FF6B35" style={{ marginTop: 24 }} />
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
              <Sparkles size={16} color="#FF6B35" />
            </TouchableOpacity>
          ))
        )}

        {selectedId ? (
          <View style={styles.summaryCard}>
            {summaryQ.isLoading ? (
              <ActivityIndicator color="#FF6B35" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  intro: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20 },
  empty: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 20, lineHeight: 20 },
  runRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161618',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  runRowSelected: { borderColor: '#FF6B35' },
  runName: { color: '#fff', fontWeight: '600', marginBottom: 2 },
  runMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  summaryCard: {
    backgroundColor: '#161618',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  summaryText: { color: '#fff', fontSize: 14, lineHeight: 20 },
});
