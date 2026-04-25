import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useMe, useUpdateMe } from '@/api/hooks';
import { useBottomBarActions } from '@/components/nav/BottomBarActionsContext';

export default function EditProfileScreen() {
  const meQ = useMe();
  const update = useUpdateMe();
  const { setActions, clearActions } = useBottomBarActions();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Hydrate the form once `me` resolves.
  useEffect(() => {
    if (!meQ.data) return;
    setName(meQ.data.name ?? '');
    setBio(meQ.data.bio ?? '');
    setCity(meQ.data.city ?? '');
    setState(meQ.data.state ?? '');
  }, [meQ.data]);

  const submit = async () => {
    try {
      await update.mutateAsync({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not save', (e as Error)?.message ?? 'Try again later');
    }
  };

  useEffect(() => {
    setActions([
      {
        label: 'Save',
        onPress: submit,
        loading: update.isPending,
        disabled: update.isPending,
      },
    ]);
    return () => clearActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bio, city, state, update.isPending]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="rgba(255,255,255,0.4)"
          maxLength={80}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="A few words about you"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={500}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="San Francisco"
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={100}
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={setState}
              placeholder="CA"
              placeholderTextColor="rgba(255,255,255,0.4)"
              maxLength={100}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 22 },
  body: { paddingHorizontal: 20, paddingBottom: 140 },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#161618',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
});
