import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';

type ClubRow = { id: string; name: string };

type Props = {
  visible: boolean;
  onDismiss: () => void;
  clubs: ClubRow[];
  onPickClub: (clubId: string) => void;
};

export function ShareToClubModal({ visible, onDismiss, clubs, onPickClub }: Props) {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Share to a club</Text>
          <Text style={styles.modalHint}>Pick a club. Your post will link to this activity.</Text>
          <FlatList
            data={clubs}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clubRow}
                onPress={() => onPickClub(item.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.clubName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalCancel} onPress={onDismiss}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: t.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 36,
      maxHeight: '55%',
    },
    modalTitle: { color: t.text, fontSize: 18, fontWeight: '700' },
    modalHint: { color: t.textMuted, fontSize: 13, marginTop: 6, marginBottom: 12 },
    clubRow: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    clubName: { color: t.text, fontSize: 16, fontWeight: '600' },
    modalCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
    modalCancelText: { color: t.textSecondary, fontSize: 15 },
  });
}
