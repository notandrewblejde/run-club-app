import { useLocalSearchParams } from 'expo-router';
import { useUserFollowing } from '@/api/hooks';
import { FollowList } from '@/components/social/FollowList';

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useUserFollowing(id);
  return (
    <FollowList
      title="Following"
      isLoading={q.isLoading}
      data={q.data?.data ?? []}
      emptyText="Not following anyone yet."
    />
  );
}
