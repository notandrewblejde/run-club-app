import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useCreateGoal } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

interface DurationOption {
  label: string;
  days: number;
}

const DURATIONS: DurationOption[] = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function NewGoalScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [targetMiles, setTargetMiles] = useState('100');
  const [durationDays, setDurationDays] = useState<number>(30);
  const createGoal = useCreateGoal(clubId ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + durationDays);
    return { start_date: isoDate(start), end_date: isoDate(end) };
  }, [durationDays]);

  const submit = async () => {
    if (!clubId) return;
    const trimmed = name.trim();
    const target = Number(targetMiles);
    if (!trimmed) {
      Alert.alert('Goal name is required');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      Alert.alert('Target must be a positive number');
      return;
    }
    try {
      await createGoal.mutateAsync({
        name: trimmed,
        target_distance_miles: target,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not create goal', (e as Error)?.message ?? 'Try again later');
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Create goal',
        onPress: submit,
        loading: createGoal.isPending,
        disabled: !name.trim() || !targetMiles || createGoal.isPending,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, targetMiles, durationDays, createGoal.isPending]);

  if (!clubId) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New goal</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. October mileage challenge"
          placeholderTextColor={tokens.placeholder}
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={80}
        />

        <Text style={styles.label}>Target distance (miles)</Text>
        <TextInput
          style={styles.input}
          placeholder="100"
          placeholderTextColor={tokens.placeholder}
          value={targetMiles}
          onChangeText={setTargetMiles}
          inputMode="decimal"
          keyboardType="decimal-pad"
          maxLength={6}
        />

        <Text style={styles.label}>Duration</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d.days}
              onPress={() => setDurationDays(d.days)}
              style={[styles.chip, durationDays === d.days && styles.chipActive]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.chipLabel,
                  durationDays === d.days && styles.chipLabelActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateNote}>
          <Calendar size={14} color={tokens.textSecondary} />
          <Text style={styles.dateNoteText}>
            {dateRange.start_date} → {dateRange.end_date}
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22 },
    body: { paddingHorizontal: 20, gap: 8 },
    label: {
      color: t.textSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 4,
    },
    input: {
      backgroundColor: t.surfaceElevated,
      color: t.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: t.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    chipActive: { backgroundColor: t.primary },
    chipLabel: { color: t.textSecondary, fontSize: 13, fontWeight: '500' },
    chipLabelActive: { color: t.onPrimary, fontWeight: '600' },
    dateNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 8,
    },
    dateNoteText: { color: t.textSecondary, fontSize: 13 },
  });
}
