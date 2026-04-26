import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, History } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCreateGoal } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type DurationKey = 7 | 30 | 90 | 180 | 'custom';

interface DurationOption {
  label: string;
  key: DurationKey;
}

const DURATIONS: DurationOption[] = [
  { label: '1 week', key: 7 },
  { label: '1 month', key: 30 },
  { label: '3 months', key: 90 },
  { label: '6 months', key: 180 },
  { label: 'Custom', key: 'custom' },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function NewGoalScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [targetMiles, setTargetMiles] = useState('100');
  const [durationKey, setDurationKey] = useState<DurationKey>(30);
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => addDays(new Date(), 30));
  const [pickerOpen, setPickerOpen] = useState<null | 'start' | 'end'>(null);
  const createGoal = useCreateGoal(clubId ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const dateRange = useMemo(() => {
    if (durationKey === 'custom') {
      return { start_date: isoDate(customStart), end_date: isoDate(customEnd) };
    }
    const start = new Date();
    const end = addDays(start, durationKey);
    return { start_date: isoDate(start), end_date: isoDate(end) };
  }, [durationKey, customStart, customEnd]);

  const isPastStart = useMemo(() => {
    return dateRange.start_date < isoDate(new Date());
  }, [dateRange.start_date]);

  const customRangeInvalid =
    durationKey === 'custom' && customEnd.getTime() < customStart.getTime();

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
    if (customRangeInvalid) {
      Alert.alert('End date must be after start date');
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
        disabled:
          !name.trim() ||
          !targetMiles ||
          createGoal.isPending ||
          customRangeInvalid,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, targetMiles, durationKey, customStart, customEnd, customRangeInvalid, createGoal.isPending]);

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
              key={String(d.key)}
              onPress={() => setDurationKey(d.key)}
              style={[styles.chip, durationKey === d.key && styles.chipActive]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.chipLabel,
                  durationKey === d.key && styles.chipLabelActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {durationKey === 'custom' ? (
          <View style={styles.customRow}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setPickerOpen('start')}
              activeOpacity={0.85}
            >
              <Text style={styles.dateFieldLabel}>Start</Text>
              <Text style={styles.dateFieldValue}>{isoDate(customStart)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setPickerOpen('end')}
              activeOpacity={0.85}
            >
              <Text style={styles.dateFieldLabel}>End</Text>
              <Text style={styles.dateFieldValue}>{isoDate(customEnd)}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.dateNote}>
          <Calendar size={14} color={tokens.textSecondary} />
          <Text style={styles.dateNoteText}>
            {dateRange.start_date} → {dateRange.end_date}
          </Text>
        </View>

        {customRangeInvalid ? (
          <Text style={styles.warn}>End date must be after start date.</Text>
        ) : null}

        {isPastStart ? (
          <View style={styles.backfillNote}>
            <History size={14} color={tokens.accentBlue} />
            <Text style={styles.backfillText}>
              Past start date — existing activities in this window will be
              counted automatically (only those already synced from Strava).
            </Text>
          </View>
        ) : null}
      </View>

      {pickerOpen ? (
        <DateTimePicker
          value={pickerOpen === 'start' ? customStart : customEnd}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_event, selected) => {
            // On Android the picker dismisses itself; on iOS it stays open
            // until we close it. Close in both cases when a value comes back.
            const which = pickerOpen;
            setPickerOpen(null);
            if (!selected) return;
            if (which === 'start') setCustomStart(selected);
            else setCustomEnd(selected);
          }}
        />
      ) : null}
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
    customRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    dateField: {
      flex: 1,
      backgroundColor: t.surfaceElevated,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    dateFieldLabel: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: 'uppercase',
    },
    dateFieldValue: {
      color: t.text,
      fontSize: 15,
      fontWeight: '600',
      marginTop: 2,
    },
    warn: {
      color: t.error,
      fontSize: 13,
      marginTop: 4,
    },
    backfillNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      padding: 10,
      backgroundColor: t.surface,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.divider,
    },
    backfillText: { color: t.textSecondary, fontSize: 12, flex: 1, lineHeight: 16 },
  });
}
