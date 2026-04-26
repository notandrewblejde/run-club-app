import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, History } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useClubGoals, useUpdateGoal } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function EditGoalScreen() {
  const { tokens, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id: clubId, goalId } = useLocalSearchParams<{ id: string; goalId: string }>();
  const goalsQ = useClubGoals(clubId, false);
  const goal = useMemo(
    () => goalsQ.data?.data?.find((g) => g.id === goalId),
    [goalsQ.data, goalId],
  );

  const [name, setName] = useState('');
  const [targetMiles, setTargetMiles] = useState('');
  const [customStart, setCustomStart] = useState<Date>(() => new Date());
  const [customEnd, setCustomEnd] = useState<Date>(() => addDays(new Date(), 30));
  const [pickerOpen, setPickerOpen] = useState<null | 'start' | 'end'>(null);
  const [draftDate, setDraftDate] = useState<Date>(() => new Date());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (goal && !hydrated) {
      setName(goal.name ?? '');
      setTargetMiles(String(goal.target_distance_miles ?? ''));
      if (goal.start_date) setCustomStart(parseLocalDate(goal.start_date));
      if (goal.end_date) setCustomEnd(parseLocalDate(goal.end_date));
      setHydrated(true);
    }
  }, [goal, hydrated]);

  useEffect(() => {
    if (pickerOpen === 'start') setDraftDate(customStart);
    else if (pickerOpen === 'end') setDraftDate(customEnd);
  }, [pickerOpen, customStart, customEnd]);

  const updateGoal = useUpdateGoal(clubId ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const dateRange = useMemo(
    () => ({ start_date: isoDate(customStart), end_date: isoDate(customEnd) }),
    [customStart, customEnd],
  );

  const isPastStart = useMemo(() => {
    return dateRange.start_date < isoDate(new Date());
  }, [dateRange.start_date]);

  const customRangeInvalid = customEnd.getTime() < customStart.getTime();

  const submit = async () => {
    if (!clubId || !goalId) return;
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
      Alert.alert('End date must be on or after start date');
      return;
    }
    try {
      await updateGoal.mutateAsync({
        goalId,
        body: {
          name: trimmed,
          target_distance_miles: target,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not update goal', (e as Error)?.message ?? 'Try again later');
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    setActions([
      {
        label: 'Save changes',
        onPress: submit,
        loading: updateGoal.isPending,
        disabled:
          !name.trim() ||
          !targetMiles ||
          updateGoal.isPending ||
          customRangeInvalid,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, targetMiles, customStart, customEnd, customRangeInvalid, updateGoal.isPending, hydrated]);

  if (!clubId || !goalId) return null;

  if (goalsQ.isLoading && !goal) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={tokens.accentBlue} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.container, { padding: 24, paddingTop: 80 }]}>
        <Text style={{ color: tokens.textSecondary }}>Goal not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.accentBlue }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit goal</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. October mileage challenge"
          placeholderTextColor={tokens.placeholder}
          value={name}
          onChangeText={setName}
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

        <Text style={styles.label}>Dates</Text>
        <Text style={styles.customHint}>Tap start or end to change dates.</Text>
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

        <View style={styles.dateNote}>
          <Calendar size={14} color={tokens.textSecondary} />
          <Text style={styles.dateNoteText}>
            {dateRange.start_date} → {dateRange.end_date}
          </Text>
        </View>

        {customRangeInvalid ? (
          <Text style={styles.warn}>End date must be on or after start date.</Text>
        ) : null}

        {isPastStart ? (
          <View style={styles.backfillNote}>
            <History size={14} color={tokens.accentBlue} />
            <Text style={styles.backfillText}>
              Past start date — existing activities in this window will be counted automatically
              (only those already synced from Strava).
            </Text>
          </View>
        ) : null}
      </View>

      <Modal
        visible={pickerOpen !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPickerOpen(null)} hitSlop={12}>
                <Text style={styles.modalHeaderBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {pickerOpen === 'start' ? 'Start date' : 'End date'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (pickerOpen === 'start') {
                    setCustomStart(draftDate);
                    if (draftDate.getTime() > customEnd.getTime()) {
                      setCustomEnd(addDays(draftDate, 1));
                    }
                  } else {
                    const nextEnd =
                      draftDate.getTime() < customStart.getTime() ? customStart : draftDate;
                    setCustomEnd(nextEnd);
                  }
                  setPickerOpen(null);
                }}
                hitSlop={12}
              >
                <Text style={styles.modalHeaderBtnPrimary}>Done</Text>
              </TouchableOpacity>
            </View>
            {pickerOpen ? (
              <DateTimePicker
                key={pickerOpen}
                value={draftDate}
                mode="date"
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={tokens.accentBlue}
                onChange={(_event, selected) => {
                  if (selected) setDraftDate(selected);
                }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
    customHint: {
      color: t.textMuted,
      fontSize: 12,
      marginTop: 8,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: t.surfaceSheet,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 28,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.divider,
    },
    modalTitle: {
      color: t.text,
      fontSize: 16,
      fontWeight: '600',
    },
    modalHeaderBtn: {
      color: t.textSecondary,
      fontSize: 16,
      fontWeight: '500',
    },
    modalHeaderBtnPrimary: {
      color: t.accentBlue,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
