import { useLocalSearchParams } from 'expo-router';
import { useUserFollowers } from '@/api/hooks';
import { FollowList } from '@/components/social/FollowList';

export default function FollowersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useUserFollowers(id);
  return (
    <FollowList
      title="Followers"
      isLoading={q.isLoading}
      data={q.data?.data ?? []}
      emptyText="No followers yet."
    />
  );
}
