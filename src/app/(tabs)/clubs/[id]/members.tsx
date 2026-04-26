import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, UserMinus, Crown, User as UserIcon } from 'lucide-react-native';
import {
  useClub,
  useClubMembers,
  useRemoveMember,
  useUpdateMemberRole,
  useMe,
} from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeTokens } from '@/theme/tokens';
import type { components } from '@/api/schema';

type Membership = components['schemas']['ClubMembership'];
type Role = 'owner' | 'admin' | 'member';

const ROLE_ICONS: Record<Role, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  member: UserIcon,
};

export default function MembersScreen() {
  const { tokens } = useTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubQ = useClub(id);
  const membersQ = useClubMembers(id);
  const meQ = useMe();
  const updateRole = useUpdateMemberRole(id ?? '');
  const removeMember = useRemoveMember(id ?? '');
  const { setActions, clearActions } = useBottomBarActions();

  const [actionTarget, setActionTarget] = useState<Membership | null>(null);

  const myId = meQ.data?.id;
  const club = clubQ.data;
  const members = membersQ.data?.data ?? [];
  const myRole = club?.viewer_role;
  const isOwner = myRole === 'owner';
  const canManage = isOwner || myRole === 'admin';

  // Surface "Invite member" action when I'm an admin or owner.
  useEffect(() => {
    if (canManage && id) {
      setActions([
        {
          label: 'Invite',
          onPress: () => router.push(`/(tabs)/clubs/${id}/invite`),
        },
      ]);
    } else {
      clearActions();
    }
    return () => clearActions();
  }, [canManage, id, setActions, clearActions]);

  if (!id) return null;

  const handleChangeRole = async (m: Membership, role: Role) => {
    if (!m.user?.id) return;
    try {
      await updateRole.mutateAsync({ userId: m.user.id, role });
      setActionTarget(null);
    } catch (e: unknown) {
      Alert.alert('Could not change role', (e as Error)?.message ?? 'Try again later');
    }
  };

  const handleRemove = (m: Membership) => {
    if (!m.user?.id) return;
    Alert.alert(
      'Remove member?',
      `${m.user.name ?? 'This user'} will lose access to the club.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember.mutateAsync(m.user!.id);
              setActionTarget(null);
            } catch (e: unknown) {
              Alert.alert('Could not remove', (e as Error)?.message ?? 'Try again later');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        <Text style={styles.subtitle}>{club?.name}</Text>
      </View>

      {membersQ.isLoading ? (
        <ActivityIndicator color={tokens.accentBlue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.user?.id ?? item.club_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const RoleIcon = ROLE_ICONS[(item.role as Role) ?? 'member'];
            const isMe = item.user?.id === myId;
            const canActOnTarget =
              canManage && !isMe && item.role !== 'owner';
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={canActOnTarget ? 0.85 : 1}
                onPress={() => {
                  if (canActOnTarget) {
                    setActionTarget(item);
                  } else if (item.user?.id) {
                    router.push(`/(tabs)/users/${item.user.id}`);
                  }
                }}
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.user?.name ?? 'Unnamed'}</Text>
                  <View style={styles.roleRow}>
                    <RoleIcon size={11} color={tokens.textMuted} />
                    <Text style={styles.role}>{item.role}</Text>
                    {isMe ? <Text style={styles.role}>(you)</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <ActionSheet
        target={actionTarget}
        onDismiss={() => setActionTarget(null)}
        onChangeRole={handleChangeRole}
        onRemove={handleRemove}
        canPromote={isOwner}
        styles={styles}
        tokens={tokens}
      />
    </View>
  );
}

function ActionSheet({
  target,
  onDismiss,
  onChangeRole,
  onRemove,
  canPromote,
  tokens,
  styles,
}: {
  target: Membership | null;
  onDismiss: () => void;
  onChangeRole: (m: Membership, r: Role) => void;
  onRemove: (m: Membership) => void;
  canPromote: boolean;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Modal
      visible={!!target}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{target?.user?.name ?? 'Member'}</Text>
          {canPromote && target && target.role !== 'admin' ? (
            <SheetItem
              Icon={ShieldCheck}
              label="Make admin"
              onPress={() => onChangeRole(target, 'admin')}
              tokens={tokens}
              styles={styles}
            />
          ) : null}
          {canPromote && target && target.role === 'admin' ? (
            <SheetItem
              Icon={UserIcon}
              label="Demote to member"
              onPress={() => onChangeRole(target, 'member')}
              tokens={tokens}
              styles={styles}
            />
          ) : null}
          {target ? (
            <SheetItem
              Icon={UserMinus}
              label="Remove from club"
              destructive
              onPress={() => onRemove(target)}
              tokens={tokens}
              styles={styles}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetItem({
  Icon,
  label,
  onPress,
  destructive,
  tokens,
  styles,
}: {
  Icon: typeof Crown;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  tokens: ThemeTokens;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={styles.sheetRow} onPress={onPress} activeOpacity={0.7}>
      <Icon size={18} color={destructive ? tokens.error : tokens.text} />
      <Text style={[styles.sheetLabel, destructive && { color: tokens.error }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(t: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { color: t.text, fontWeight: '700', fontSize: 22 },
    subtitle: { color: t.textMuted, fontSize: 13, marginTop: 2 },
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
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    role: { color: t.textMuted, fontSize: 12 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    modalSheet: {
      backgroundColor: t.surfaceSheet,
      borderRadius: 14,
      paddingVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    sheetTitle: {
      color: t.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sheetLabel: { color: t.text, fontSize: 15 },
  });
}
