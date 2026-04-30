import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, unwrapNoContent, type components } from './client';
import { qk } from './queryClient';

type Activity = components['schemas']['Activity'];
type Comment = components['schemas']['Comment'];
type Kudo = components['schemas']['Kudo'];
type Club = components['schemas']['Club'];
type ClubMembership = components['schemas']['ClubMembership'];
type Post = components['schemas']['Post'];
type Goal = components['schemas']['Goal'];
type GoalProgress = components['schemas']['GoalProgress'];
type LeaderboardEntry = components['schemas']['LeaderboardEntry'];
type UserProfile = components['schemas']['UserProfile'];
type User = components['schemas']['User'];
type Follow = components['schemas']['Follow'];
type TrainingGoal = components['schemas']['TrainingGoal'];
type TrainingToday = components['schemas']['TrainingToday'];
type Notification = components['schemas']['Notification'];
const GOAL_FEEDBACK_PAGE_SIZE = 20;

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

// ---------- Training & notifications ----------

export function useTrainingGoal() {
  return useQuery({
    queryKey: qk.trainingGoal(),
    queryFn: async () => unwrap(api.GET('/v1/me/training-goal')),
  });
}

export function useTrainingToday() {
  return useQuery({
    queryKey: qk.trainingToday(),
    queryFn: async () => unwrap(api.GET('/v1/me/training-today')),
  });
}

export function useNotificationsPreview() {
  return useQuery({
    queryKey: qk.notificationsPreview(),
    queryFn: async () => unwrap(api.GET('/v1/notifications/preview')),
  });
}

export function useNotifications(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  return useQuery({
    queryKey: qk.notificationsList(),
    queryFn: async () =>
      unwrap(api.GET('/v1/notifications', { params: { query: { page: 1, limit } } })),
  });
}

export function usePutTrainingGoal() {
  const qc = useQueryClient();
  return useMutation<TrainingGoal, Error, string>({
    mutationFn: async (goal_text) =>
      unwrap(api.PUT('/v1/me/training-goal', { body: { goal_text } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.trainingGoal() });
      void qc.invalidateQueries({ queryKey: qk.trainingToday() });
      void qc.invalidateQueries({ queryKey: qk.trainingGoalFeedbackInfinite() });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

type HealthWorkoutImportItem = components['schemas']['HealthWorkoutImportItem'];

export function usePostHealthWorkoutImport() {
  const qc = useQueryClient();
  return useMutation<components['schemas']['HealthImportResult'], Error, HealthWorkoutImportItem[]>({
    mutationFn: async (workouts) =>
      unwrap(api.POST('/v1/me/activities/health-import', { body: { workouts } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.activities('me') });
      void qc.invalidateQueries({ queryKey: qk.activities('following') });
      void qc.invalidateQueries({ queryKey: qk.me() });
      void qc.invalidateQueries({ queryKey: ['club'] });
    },
  });
}

/**
 * Paged from newest: page 1 = most recent messages. Use {@link getNextPageParam} to load older blocks.
 */
export function useTrainingGoalFeedbackInfinite() {
  return useInfiniteQuery({
    queryKey: qk.trainingGoalFeedbackInfinite(),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      unwrap(
        api.GET('/v1/me/training-goal/feedback', {
          params: { query: { page: pageParam, limit: GOAL_FEEDBACK_PAGE_SIZE } },
        }),
      ),
    getNextPageParam: (lastPage, allPages) => (lastPage.has_more ? allPages.length + 1 : undefined),
  });
}

export function usePostTrainingGoalFeedback() {
  const qc = useQueryClient();
  return useMutation<{ reply: string }, Error, string>({
    mutationFn: async (message) =>
      unwrap(api.POST('/v1/me/training-goal/feedback', { body: { message } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.trainingGoalFeedbackInfinite() });
      void qc.invalidateQueries({ queryKey: qk.trainingGoal() });
      void qc.invalidateQueries({ queryKey: qk.trainingToday() });
    },
  });
}

export function useClearTrainingGoalFeedback() {
  const qc = useQueryClient();
  return useMutation<{ deleted: number }, Error, void>({
    mutationFn: async () => unwrap(api.DELETE('/v1/me/training-goal/feedback')),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.trainingGoalFeedbackInfinite() });
      void qc.invalidateQueries({ queryKey: qk.trainingGoal() });
      void qc.invalidateQueries({ queryKey: qk.trainingToday() });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation<Notification, Error, string>({
    mutationFn: async (id) =>
      unwrap(api.PATCH('/v1/notifications/{id}/read', { params: { path: { id } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: async () => unwrap(api.POST('/v1/notifications/read-all')),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useActivity(id: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.activity(id ?? ''),
    enabled: !!id && opts?.enabled !== false,
    queryFn: async () =>
      unwrap(api.GET('/v1/activities/{activityId}', { params: { path: { activityId: id! } } })),
  });
}

export type ActivityCoachSummaryPayload = { activity_id: string; summary: string };

export function useActivitySummary(id: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.activitySummary(id ?? ''),
    enabled: !!id && opts?.enabled !== false,
    queryFn: async () => {
      const data = await unwrap(
        api.GET('/v1/activities/{activityId}/summary', { params: { path: { activityId: id! } } }),
      );
      return data as ActivityCoachSummaryPayload;
    },
  });
}

export function useActivityCoachChat() {
  return useMutation({
    mutationFn: async (vars: { activityId: string; message: string }) =>
      unwrap(
        api.POST('/v1/activities/{activityId}/coach/chat', {
          params: { path: { activityId: vars.activityId } },
          body: { message: vars.message },
        }),
      ),
  });
}

export function useGlobalAiCoachChat() {
  return useMutation({
    mutationFn: async (vars: { message: string }) =>
      unwrap(api.POST('/v1/me/ai/chat', { body: { message: vars.message } })),
  });
}

export function useUpdateActivity(activityId: string) {
  const qc = useQueryClient();
  return useMutation<
    Activity,
    Error,
    { user_note?: string; app_photos?: string[] }
  >({
    mutationFn: (body) =>
      unwrap(
        api.PATCH('/v1/activities/{activityId}', {
          params: { path: { activityId } },
          body,
        }),
      ),
    onSuccess: (data) => {
      qc.setQueryData(qk.activity(activityId), data);
      void qc.invalidateQueries({ queryKey: qk.activities('me') });
    },
  });
}

export function usePresignActivityPhoto(activityId: string) {
  return useMutation<
    { upload_url: string; public_url: string; method: string; content_type: string },
    Error,
    string
  >({
    mutationFn: (contentType) =>
      unwrap(
        api.POST('/v1/activities/{activityId}/photos/presign', {
          params: { path: { activityId } },
          body: { content_type: contentType },
        }),
      ) as Promise<{
        upload_url: string;
        public_url: string;
        method: string;
        content_type: string;
      }>,
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

export function useClubPost(clubId: string, postId: string | undefined) {
  return useQuery({
    queryKey: qk.clubPost(clubId, postId ?? ''),
    enabled: !!postId,
    queryFn: async () =>
      unwrap(
        api.GET('/v1/clubs/{clubId}/posts/{postId}', {
          params: { path: { clubId, postId: postId! } },
        }),
      ),
  });
}

export function useCreatePost(clubId: string) {
  const qc = useQueryClient();
  return useMutation<
    Post,
    Error,
    { content: string; photos?: string[]; related_activity_id?: string }
  >({
    mutationFn: (body) =>
      unwrap(
        api.POST('/v1/clubs/{clubId}/posts', {
          params: { path: { clubId } },
          body,
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clubFeed(clubId) });
    },
  });
}

export function useUpdatePost(clubId: string) {
  const qc = useQueryClient();
  return useMutation<Post, Error, { postId: string; body: { content?: string; photos?: string[] } }>({
    mutationFn: ({ postId, body }) =>
      unwrap(
        api.PATCH('/v1/clubs/{clubId}/posts/{postId}', {
          params: { path: { clubId, postId } },
          body,
        }),
      ),
    onSuccess: (_post, vars) => {
      void qc.invalidateQueries({ queryKey: qk.clubFeed(clubId) });
      void qc.invalidateQueries({ queryKey: qk.clubPost(clubId, vars.postId) });
    },
  });
}

export function useDeletePost(clubId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (postId) =>
      unwrapNoContent(
        api.DELETE('/v1/clubs/{clubId}/posts/{postId}', {
          params: { path: { clubId, postId } },
        }),
      ),
    onSuccess: (_void, postId) => {
      void qc.invalidateQueries({ queryKey: qk.clubFeed(clubId) });
      void qc.removeQueries({ queryKey: qk.clubPost(clubId, postId) });
    },
  });
}

export function usePresignPostPhoto(clubId: string) {
  return useMutation<
    { upload_url: string; public_url: string; method: string; content_type: string },
    Error,
    string
  >({
    mutationFn: (contentType) =>
      unwrap(
        api.POST('/v1/clubs/{clubId}/posts/presign', {
          params: { path: { clubId } },
          body: { content_type: contentType },
        }),
      ) as Promise<{
        upload_url: string;
        public_url: string;
        method: string;
        content_type: string;
      }>,
  });
}

export function useUpdateClub(clubId: string) {
  const qc = useQueryClient();
  return useMutation<
    Club,
    Error,
    Partial<{
      name: string;
      description: string;
      privacy_level: 'public' | 'private';
    }>
  >({
    mutationFn: (body) =>
      unwrap(
        api.PATCH('/v1/clubs/{clubId}', {
          params: { path: { clubId } },
          body,
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.club(clubId) });
      void qc.invalidateQueries({ queryKey: qk.myClubs() });
      void qc.invalidateQueries({ queryKey: qk.publicClubs() });
    },
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
    onSuccess: (_m, clubId) => {
      void qc.invalidateQueries({ queryKey: qk.myClubs() });
      void qc.invalidateQueries({ queryKey: qk.publicClubs() });
      void qc.invalidateQueries({ queryKey: ['club', clubId, 'clubLeaderboard'] });
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

export function useCreateGoal(clubId: string) {
  const qc = useQueryClient();
  return useMutation<
    Goal,
    Error,
    { name: string; target_distance_miles: number; start_date: string; end_date: string }
  >({
    mutationFn: (body) =>
      unwrap(
        api.POST('/v1/clubs/{clubId}/goals', {
          params: { path: { clubId } },
          body,
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, true) });
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, false) });
      void qc.invalidateQueries({ queryKey: ['club', clubId, 'clubLeaderboard'] });
    },
  });
}

export function useUpdateGoal(clubId: string) {
  const qc = useQueryClient();
  return useMutation<
    Goal,
    Error,
    {
      goalId: string;
      body: Partial<{
        name: string;
        target_distance_miles: number;
        start_date: string;
        end_date: string;
      }>;
    }
  >({
    mutationFn: ({ goalId, body }) =>
      unwrap(
        api.PATCH('/v1/clubs/{clubId}/goals/{goalId}', {
          params: { path: { clubId, goalId } },
          body,
        }),
      ),
    onSuccess: (_data, { goalId }) => {
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, true) });
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, false) });
      void qc.invalidateQueries({ queryKey: qk.goalProgress(clubId, goalId) });
      void qc.invalidateQueries({ queryKey: qk.goalLeaderboard(clubId, goalId) });
      void qc.invalidateQueries({ queryKey: ['club', clubId, 'clubLeaderboard'] });
    },
  });
}

export function useDeleteGoal(clubId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (goalId) =>
      unwrapNoContent(
        api.DELETE('/v1/clubs/{clubId}/goals/{goalId}', {
          params: { path: { clubId, goalId } },
        }),
      ),
    onSuccess: (_void, goalId) => {
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, true) });
      void qc.invalidateQueries({ queryKey: qk.clubGoals(clubId, false) });
      void qc.removeQueries({ queryKey: qk.goalProgress(clubId, goalId) });
      void qc.removeQueries({ queryKey: qk.goalLeaderboard(clubId, goalId) });
      void qc.invalidateQueries({ queryKey: ['club', clubId, 'clubLeaderboard'] });
    },
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

export type ClubLeaderboardQuery =
  | { window: '30d' | '90d' }
  | { goalId: string };

export function useClubLeaderboard(
  clubId: string | undefined,
  spec: ClubLeaderboardQuery | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: spec ? qk.clubLeaderboard(clubId ?? '', spec) : ['club', 'leaderboard', 'off'],
    enabled:
      (opts?.enabled !== false) &&
      !!clubId &&
      spec != null &&
      ('window' in spec ? true : (spec as { goalId: string }).goalId.length > 0),
    queryFn: async () => {
      if (spec == null) throw new Error('No leaderboard spec');
      if ('goalId' in spec) {
        return unwrap(
          api.GET('/v1/clubs/{clubId}/leaderboard', {
            params: { path: { clubId: clubId! }, query: { goalId: spec.goalId, limit: 10 } },
          }),
        );
      }
      return unwrap(
        api.GET('/v1/clubs/{clubId}/leaderboard', {
          params: { path: { clubId: clubId! }, query: { window: spec.window, limit: 10 } },
        }),
      );
    },
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

/**
 * "People you may know" for the authenticated viewer. Friends-of-friends with
 * a recent-public-users fallback. Long stale time — suggestions are stable
 * and we'd rather avoid recomputing on every Discover-tab focus.
 */
export function useSuggestedUsers() {
  return useQuery({
    queryKey: qk.suggestedUsers(),
    queryFn: async () => unwrap(api.GET('/v1/users/suggested')),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation<
    UserProfile,
    Error,
    Partial<{
      name: string;
      bio: string;
      city: string;
      state: string;
      avatar_url: string;
      privacy_level: 'public' | 'private';
    }>
  >({
    mutationFn: (body) => unwrap(api.PATCH('/v1/users/me', { body })),
    onSuccess: (profile) => {
      qc.setQueryData(qk.me(), profile);
    },
  });
}

// ---------- Follows ----------

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation<
    { status: 'pending' | 'accepted' },
    Error,
    string,
    { previous?: UserProfile }
  >({
    mutationFn: (userId) =>
      unwrap(api.POST('/v1/users/{userId}/follow', { params: { path: { userId } } })) as Promise<{
        status: 'pending' | 'accepted';
      }>,
    onMutate: async (userId) => {
      // Snapshot + optimistically flip follow_status on the cached profile so
      // the user-detail page (and anything else reading qk.user) reflects the
      // change immediately. Default to "accepted"; if the target is private
      // the server will respond with "pending" and the onSuccess handler
      // re-syncs via invalidation.
      await qc.cancelQueries({ queryKey: qk.user(userId) });
      const previous = qc.getQueryData<UserProfile>(qk.user(userId));
      if (previous) {
        qc.setQueryData<UserProfile>(qk.user(userId), {
          ...previous,
          follow_status: 'accepted',
          followers_count: previous.followers_count + 1,
        });
      }
      return { previous };
    },
    onError: (_err, userId, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(qk.user(userId), ctx.previous);
      }
    },
    onSuccess: (_d, userId) => {
      void qc.invalidateQueries({ queryKey: qk.user(userId) });
      void qc.invalidateQueries({ queryKey: qk.activities('following') });
      void qc.invalidateQueries({ queryKey: qk.me() });
      const me = qc.getQueryData<UserProfile>(qk.me());
      if (me?.id) {
        void qc.invalidateQueries({ queryKey: qk.following(me.id) });
      }
    },
  });
}

export function useUserFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: qk.followers(userId ?? ''),
    enabled: !!userId,
    queryFn: () =>
      unwrap(
        api.GET('/v1/users/{userId}/followers', {
          params: { path: { userId: userId! }, query: { page: 1, limit: 100 } },
        }),
      ),
  });
}

export function useUserFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: qk.following(userId ?? ''),
    enabled: !!userId,
    queryFn: () =>
      unwrap(
        api.GET('/v1/users/{userId}/following', {
          params: { path: { userId: userId! }, query: { page: 1, limit: 100 } },
        }),
      ),
  });
}

export function useUserActivities(userId: string | undefined) {
  return useQuery({
    queryKey: qk.userActivities(userId ?? ''),
    enabled: !!userId,
    queryFn: () =>
      unwrap(
        api.GET('/v1/users/{userId}/activities', {
          params: { path: { userId: userId! }, query: { page: 1, limit: 20 } },
        }),
      ),
  });
}

export function useFollowRequests() {
  return useQuery({
    queryKey: qk.followRequests(),
    queryFn: () => unwrap(api.GET('/v1/follow-requests', { params: { query: { page: 1, limit: 50 } } })),
  });
}

export function useAcceptFollowRequest() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (requestId) =>
      unwrap(
        api.POST('/v1/follow-requests/{requestId}/accept', {
          params: { path: { requestId } },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.followRequests() });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

export function useRejectFollowRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (requestId) => {
      const { response } = await api.DELETE('/v1/follow-requests/{requestId}', {
        params: { path: { requestId } },
      });
      if (!response.ok && response.status !== 204) throw new Error('Reject failed');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.followRequests() });
    },
  });
}

// ---------- Avatar upload (presigned S3) ----------

export function usePresignAvatar() {
  return useMutation<
    { upload_url: string; public_url: string; method: string; content_type: string },
    Error,
    string // content_type
  >({
    mutationFn: (contentType) =>
      unwrap(
        api.POST('/v1/users/me/avatar/presign', {
          body: { content_type: contentType },
        }),
      ) as Promise<{
        upload_url: string;
        public_url: string;
        method: string;
        content_type: string;
      }>,
  });
}

// ---------- Club feed + invitations + members ----------

export function useClubFeed(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubFeed(clubId ?? ''),
    enabled: !!clubId,
    queryFn: () =>
      unwrap(
        api.GET('/v1/clubs/{clubId}/feed', {
          params: { path: { clubId: clubId! }, query: { page: 1, limit: 30 } },
        }),
      ),
  });
}

export function useInviteMember(clubId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (userIdToInvite) =>
      unwrap(
        api.POST('/v1/clubs/{clubId}/invitations', {
          params: { path: { clubId } },
          body: { user_id: userIdToInvite },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clubMembers(clubId) });
    },
  });
}

export function useUpdateMemberRole(clubId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { userId: string; role: 'owner' | 'admin' | 'member' }>({
    mutationFn: ({ userId, role }) =>
      unwrap(
        api.PATCH('/v1/clubs/{clubId}/members/{userId}', {
          params: { path: { clubId, userId } },
          body: { role },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clubMembers(clubId) });
    },
  });
}

export function useRemoveMember(clubId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (userId) => {
      const { response } = await api.DELETE('/v1/clubs/{clubId}/members/{userId}', {
        params: { path: { clubId, userId } },
      });
      if (!response.ok && response.status !== 204) throw new Error('Remove failed');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.clubMembers(clubId) });
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
      const me = qc.getQueryData<UserProfile>(qk.me());
      if (me?.id) {
        void qc.invalidateQueries({ queryKey: qk.following(me.id) });
      }
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

// Push notification preferences
export function usePushPrefs() {
  return useQuery({
    queryKey: ['push-prefs'],
    queryFn: () => unwrap(api.GET('/v1/me/push/prefs' as any, {})),
    staleTime: 60_000,
  })
}

export function useUpdatePushPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: {
      club_activity_alerts?: boolean
      daily_coach_tip?: boolean
      goal_progress?: boolean
      activity_comment_alerts?: boolean
    }) => unwrap(api.PATCH('/v1/me/push/prefs' as any, { body: prefs })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-prefs'] }),
  })
}
