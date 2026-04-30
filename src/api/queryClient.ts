import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient — exported so non-component code (e.g. auth flows)
 * can invalidate after side effects.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, err: unknown) => {
        const status = (err as { status?: number } | undefined)?.status;
        if (status && status < 500) return false;
        return count < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

/** Centralized query-key factory — keeps invalidations consistent across hooks. */
export const qk = {
  me: () => ['me'] as const,
  user: (userId: string) => ['user', userId] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
  suggestedUsers: () => ['users', 'suggested'] as const,

  activities: (scope: 'me' | 'following') => ['activities', scope] as const,
  activity: (id: string) => ['activity', id] as const,
  activitySummary: (id: string) => ['activity', id, 'summary'] as const,
  activityComments: (id: string) => ['activity', id, 'comments'] as const,
  activityKudo: (id: string) => ['activity', id, 'kudo'] as const,

  myClubs: () => ['clubs', 'mine'] as const,
  publicClubs: () => ['clubs', 'public'] as const,
  club: (clubId: string) => ['club', clubId] as const,
  clubPost: (clubId: string, postId: string) => ['club', clubId, 'post', postId] as const,
  clubMembers: (clubId: string) => ['club', clubId, 'members'] as const,
  clubGoals: (clubId: string, activeOnly: boolean) =>
    ['club', clubId, 'goals', activeOnly ? 'active' : 'all'] as const,
  goalProgress: (clubId: string, goalId: string) =>
    ['club', clubId, 'goal', goalId, 'progress'] as const,
  goalLeaderboard: (clubId: string, goalId: string) =>
    ['club', clubId, 'goal', goalId, 'leaderboard'] as const,
  /** Club-wide leaderboard: rolling 30d / 90d, or a goal */
  clubLeaderboard: (clubId: string, spec: { window: '30d' | '90d' } | { goalId: string }) =>
    [
      'club',
      clubId,
      'clubLeaderboard',
      'window' in spec ? spec.window : 'goal',
      'window' in spec ? '' : spec.goalId,
    ] as const,

  followers: (userId: string) => ['user', userId, 'followers'] as const,
  following: (userId: string) => ['user', userId, 'following'] as const,
  userActivities: (userId: string) => ['user', userId, 'activities'] as const,
  followRequests: () => ['follow-requests'] as const,
  clubFeed: (clubId: string) => ['club', clubId, 'feed'] as const,

  trainingGoal: () => ['training', 'goal'] as const,
  trainingGoalFeedbackInfinite: () => ['training', 'goal', 'feedback', 'infinite'] as const,
  trainingToday: () => ['training', 'today'] as const,
  notificationsPreview: () => ['notifications', 'preview'] as const,
  notificationsList: () => ['notifications', 'list'] as const,
};
