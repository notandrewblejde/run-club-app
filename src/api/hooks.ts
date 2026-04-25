import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type components } from './client';
import { qk } from './queryClient';

type Activity = components['schemas']['Activity'];
type Comment = components['schemas']['Comment'];
type Kudo = components['schemas']['Kudo'];
type Club = components['schemas']['Club'];
type ClubMembership = components['schemas']['ClubMembership'];
type Goal = components['schemas']['Goal'];
type GoalProgress = components['schemas']['GoalProgress'];
type LeaderboardEntry = components['schemas']['LeaderboardEntry'];
type UserProfile = components['schemas']['UserProfile'];
type User = components['schemas']['User'];
type Follow = components['schemas']['Follow'];

// ---------- Activities ----------

export function useFeed(scope: 'me' | 'following') {
  return useQuery({
    queryKey: qk.activities(scope),
    queryFn: async () => {
      if (scope === 'following') {
        return unwrap(api.GET('/v1/feed/home', { params: { query: { page: 1, limit: 20 } } }));
      }
      return unwrap(api.GET('/v1/activities', { params: { query: { page: 1, limit: 20 } } }));
    },
  });
}

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: qk.activity(id ?? ''),
    enabled: !!id,
    queryFn: async () =>
      unwrap(api.GET('/v1/activities/{activityId}', { params: { path: { activityId: id! } } })),
  });
}

export function useActivitySummary(id: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.activitySummary(id ?? ''),
    enabled: !!id && opts?.enabled !== false,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/activities/{activityId}/summary', { params: { path: { activityId: id! } } }),
      ),
  });
}

// ---------- Engagement ----------

export function useToggleKudo(activityId: string) {
  const qc = useQueryClient();
  return useMutation<Kudo, Error, void, { previous?: Activity }>({
    mutationFn: () =>
      unwrap(api.POST('/v1/activities/{activityId}/kudos', { params: { path: { activityId } } })),
    onMutate: async () => {
      // Optimistic update so kudoing feels instant.
      await qc.cancelQueries({ queryKey: qk.activity(activityId) });
      const previous = qc.getQueryData<Activity>(qk.activity(activityId));
      if (previous) {
        qc.setQueryData<Activity>(qk.activity(activityId), {
          ...previous,
          kudoed_by_viewer: !previous.kudoed_by_viewer,
          kudos_count: previous.kudos_count + (previous.kudoed_by_viewer ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.activity(activityId), ctx.previous);
    },
    onSuccess: (kudo) => {
      qc.setQueryData<Activity | undefined>(qk.activity(activityId), (old) =>
        old ? { ...old, kudoed_by_viewer: kudo.kudoed_by_viewer, kudos_count: kudo.kudos_count } : old,
      );
    },
  });
}

export function useComments(activityId: string | undefined) {
  return useQuery({
    queryKey: qk.activityComments(activityId ?? ''),
    enabled: !!activityId,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/activities/{activityId}/comments', {
          params: { path: { activityId: activityId! } },
        }),
      ),
  });
}

export function useAddComment(activityId: string) {
  const qc = useQueryClient();
  return useMutation<Comment, Error, string>({
    mutationFn: (content: string) =>
      unwrap(
        api.POST('/v1/activities/{activityId}/comments', {
          params: { path: { activityId } },
          body: { content },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.activityComments(activityId) });
      void qc.invalidateQueries({ queryKey: qk.activity(activityId) });
    },
  });
}

export function useDeleteComment(activityId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (commentId: string) => {
      const { response, error } = await api.DELETE(
        '/v1/activities/{activityId}/comments/{commentId}',
        { params: { path: { activityId, commentId } } },
      );
      if (error || !response.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.activityComments(activityId) });
      void qc.invalidateQueries({ queryKey: qk.activity(activityId) });
    },
  });
}

// ---------- Clubs ----------

export function useMyClubs() {
  return useQuery({
    queryKey: qk.myClubs(),
    queryFn: async () =>
      unwrap(api.GET('/v1/clubs/my-clubs', { params: { query: { page: 1, limit: 50 } } })),
  });
}

export function usePublicClubs() {
  return useQuery({
    queryKey: qk.publicClubs(),
    queryFn: async () =>
      unwrap(api.GET('/v1/clubs/public', { params: { query: { page: 1, limit: 50 } } })),
  });
}

export function useClub(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.club(clubId ?? ''),
    enabled: !!clubId,
    queryFn: async () =>
      unwrap(api.GET('/v1/clubs/{clubId}', { params: { path: { clubId: clubId! } } })),
  });
}

export function useClubMembers(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubMembers(clubId ?? ''),
    enabled: !!clubId,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/clubs/{clubId}/members', {
          params: { path: { clubId: clubId! }, query: { page: 1, limit: 100 } },
        }),
      ),
  });
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation<
    Club,
    Error,
    { name: string; description?: string; privacy_level: 'public' | 'private' }
  >({
    mutationFn: (body) => unwrap(api.POST('/v1/clubs', { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myClubs() });
    },
  });
}

export function useJoinClub() {
  const qc = useQueryClient();
  return useMutation<ClubMembership, Error, string>({
    mutationFn: (clubId) =>
      unwrap(api.POST('/v1/clubs/{clubId}/join', { params: { path: { clubId } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.myClubs() });
      void qc.invalidateQueries({ queryKey: qk.publicClubs() });
    },
  });
}

// ---------- Goals ----------

export function useClubGoals(clubId: string | undefined, activeOnly = true) {
  return useQuery({
    queryKey: qk.clubGoals(clubId ?? '', activeOnly),
    enabled: !!clubId,
    queryFn: async () => {
      const path = activeOnly
        ? '/v1/clubs/{clubId}/goals/active'
        : '/v1/clubs/{clubId}/goals';
      return unwrap(api.GET(path, { params: { path: { clubId: clubId! } } }));
    },
  });
}

export function useGoalProgress(clubId: string, goalId: string | undefined) {
  return useQuery({
    queryKey: qk.goalProgress(clubId, goalId ?? ''),
    enabled: !!goalId,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/clubs/{clubId}/goals/{goalId}/progress', {
          params: { path: { clubId, goalId: goalId! } },
        }),
      ),
  });
}

export function useGoalLeaderboard(clubId: string, goalId: string | undefined) {
  return useQuery({
    queryKey: qk.goalLeaderboard(clubId, goalId ?? ''),
    enabled: !!goalId,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/clubs/{clubId}/goals/{goalId}/leaderboard', {
          params: { path: { clubId, goalId: goalId! } },
        }),
      ),
  });
}

// ---------- Users / profile ----------

export function useMe(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.me(),
    enabled: opts?.enabled !== false,
    queryFn: () => unwrap(api.GET('/v1/users/me')),
  });
}

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: qk.user(userId ?? ''),
    enabled: !!userId,
    queryFn: async () =>
      unwrap(api.GET('/v1/users/{userId}', { params: { path: { userId: userId! } } })),
  });
}

export function useUserSearch(q: string, opts?: { enabled?: boolean }) {
  const enabled = (opts?.enabled !== false) && q.trim().length >= 2;
  return useQuery({
    queryKey: qk.userSearch(q),
    enabled,
    queryFn: async () => unwrap(api.GET('/v1/users', { params: { query: { q, limit: 20 } } })),
    staleTime: 60_000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation<UserProfile, Error, Partial<{ name: string; bio: string; city: string; state: string; avatar_url: string }>>({
    mutationFn: (body) => unwrap(api.PATCH('/v1/users/me', { body })),
    onSuccess: (profile) => {
      qc.setQueryData(qk.me(), profile);
    },
  });
}

// ---------- Follows ----------

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation<Follow, Error, string>({
    mutationFn: (userId) =>
      unwrap(api.POST('/v1/users/{userId}/follow', { params: { path: { userId } } })),
    onSuccess: (_d, userId) => {
      void qc.invalidateQueries({ queryKey: qk.user(userId) });
      void qc.invalidateQueries({ queryKey: qk.activities('following') });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (userId) => {
      const { response } = await api.DELETE('/v1/users/{userId}/follow', {
        params: { path: { userId } },
      });
      if (!response.ok && response.status !== 204) throw new Error('Unfollow failed');
    },
    onSuccess: (_d, userId) => {
      void qc.invalidateQueries({ queryKey: qk.user(userId) });
      void qc.invalidateQueries({ queryKey: qk.activities('following') });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

// ---------- Strava ----------

export function useTriggerStravaSync() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => unwrap(api.POST('/v1/strava/sync')),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.activities('me') });
    },
  });
}

export function useDisconnectStrava() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { response } = await api.DELETE('/v1/strava/disconnect');
      if (!response.ok) throw new Error('Disconnect failed');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

export type {
  Activity,
  Comment,
  Kudo,
  Club,
  ClubMembership,
  Goal,
  GoalProgress,
  LeaderboardEntry,
  UserProfile,
  User,
  Follow,
};
