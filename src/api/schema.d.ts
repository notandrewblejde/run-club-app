/**
 * Hand-authored placeholder. Regenerate from the running server with:
 *   npm run gen:api
 *
 * Mirrors openapi-typescript v7 output so swapping the generated file in is
 * a no-op for callers.
 */

export interface paths {
  '/v1/activities': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Activity']> } };
      };
    };
  };
  '/v1/activities/{activityId}': {
    get: {
      parameters: { path: { activityId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Activity'] } } };
    };
  };
  '/v1/activities/{activityId}/summary': {
    get: {
      parameters: { path: { activityId: string } };
      responses: {
        200: { content: { 'application/json': { activity_id: string; summary: string } } };
      };
    };
  };
  '/v1/activities/{activityId}/kudos': {
    get: {
      parameters: { path: { activityId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Kudo'] } } };
    };
    post: {
      parameters: { path: { activityId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Kudo'] } } };
    };
  };
  '/v1/activities/{activityId}/comments': {
    get: {
      parameters: { path: { activityId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Comment']> } };
      };
    };
    post: {
      parameters: { path: { activityId: string } };
      requestBody: { content: { 'application/json': { content: string } } };
      responses: { 201: { content: { 'application/json': components['schemas']['Comment'] } } };
    };
  };
  '/v1/activities/{activityId}/comments/{commentId}': {
    delete: {
      parameters: { path: { activityId: string; commentId: string } };
      responses: { 204: never };
    };
  };
  '/v1/clubs': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            name: string;
            description?: string;
            privacy_level: 'public' | 'private';
          };
        };
      };
      responses: { 201: { content: { 'application/json': components['schemas']['Club'] } } };
    };
  };
  '/v1/clubs/public': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Club']> } };
      };
    };
  };
  '/v1/clubs/my-clubs': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Club']> } };
      };
    };
  };
  '/v1/clubs/{clubId}': {
    get: {
      parameters: { path: { clubId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Club'] } } };
    };
  };
  '/v1/clubs/{clubId}/members': {
    get: {
      parameters: { path: { clubId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: {
          content: { 'application/json': ApiList<components['schemas']['ClubMembership']> };
        };
      };
    };
  };
  '/v1/clubs/{clubId}/join': {
    post: {
      parameters: { path: { clubId: string } };
      responses: {
        200: { content: { 'application/json': components['schemas']['ClubMembership'] } };
      };
    };
  };
  '/v1/clubs/{clubId}/goals': {
    get: {
      parameters: { path: { clubId: string } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Goal']> } };
      };
    };
    post: {
      parameters: { path: { clubId: string } };
      requestBody: {
        content: {
          'application/json': {
            name: string;
            target_distance_miles: number;
            start_date: string;
            end_date: string;
          };
        };
      };
      responses: { 201: { content: { 'application/json': components['schemas']['Goal'] } } };
    };
  };
  '/v1/clubs/{clubId}/goals/active': {
    get: {
      parameters: { path: { clubId: string } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Goal']> } };
      };
    };
  };
  '/v1/clubs/{clubId}/goals/{goalId}/progress': {
    get: {
      parameters: { path: { clubId: string; goalId: string } };
      responses: {
        200: { content: { 'application/json': components['schemas']['GoalProgress'] } };
      };
    };
  };
  '/v1/clubs/{clubId}/goals/{goalId}/leaderboard': {
    get: {
      parameters: { path: { clubId: string; goalId: string } };
      responses: {
        200: {
          content: { 'application/json': ApiList<components['schemas']['LeaderboardEntry']> };
        };
      };
    };
  };
  '/v1/users/me': {
    get: {
      responses: {
        200: { content: { 'application/json': components['schemas']['UserProfile'] } };
      };
    };
    patch: {
      requestBody: {
        content: {
          'application/json': Partial<{
            name: string;
            bio: string;
            city: string;
            state: string;
            avatar_url: string;
          }>;
        };
      };
      responses: {
        200: { content: { 'application/json': components['schemas']['UserProfile'] } };
      };
    };
  };
  '/v1/users': {
    get: {
      parameters: { query: { q: string; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['User']> } };
      };
    };
  };
  '/v1/users/{userId}': {
    get: {
      parameters: { path: { userId: string } };
      responses: {
        200: { content: { 'application/json': components['schemas']['UserProfile'] } };
      };
    };
  };
  '/v1/users/{userId}/follow': {
    post: {
      parameters: { path: { userId: string } };
      responses: { 201: { content: { 'application/json': components['schemas']['Follow'] } } };
    };
    delete: {
      parameters: { path: { userId: string } };
      responses: { 204: never };
    };
  };
  '/v1/users/{userId}/followers': {
    get: {
      parameters: { path: { userId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Follow']> } };
      };
    };
  };
  '/v1/users/{userId}/following': {
    get: {
      parameters: { path: { userId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Follow']> } };
      };
    };
  };
  '/v1/feed/home': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Activity']> } };
      };
    };
  };
  '/v1/strava/auth': {
    get: {
      responses: {
        200: { content: { 'application/json': { authorization_url: string } } };
      };
    };
  };
  '/v1/strava/callback': {
    get: {
      parameters: { query: { code: string } };
      responses: { 200: { content: { 'application/json': Record<string, unknown> } } };
    };
  };
  '/v1/strava/disconnect': { delete: { responses: { 200: never } } };
  '/v1/strava/sync': {
    post: { responses: { 200: { content: { 'application/json': { status: string } } } } };
  };
}

interface ApiList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  total_count: number;
  url: string;
}

export interface components {
  schemas: {
    User: {
      object: 'user';
      id: string;
      name?: string;
      avatar_url?: string;
      created?: number;
    };
    UserStats: {
      object: 'user_stats';
      total_activities: number;
      total_distance_miles: number;
      total_moving_seconds: number;
      total_elevation_ft: number;
      distance_miles_30d: number;
      activities_30d: number;
    };
    UserProfile: {
      object: 'user_profile';
      id: string;
      name?: string;
      avatar_url?: string;
      bio?: string;
      city?: string;
      state?: string;
      strava_connected: boolean;
      followers_count: number;
      following_count: number;
      is_self: boolean;
      followed_by_viewer?: boolean;
      stats: components['schemas']['UserStats'];
    };
    Activity: {
      object: 'activity';
      id: string;
      strava_id?: number;
      user?: components['schemas']['User'];
      name: string;
      sport_type?: string;
      start_date?: number;
      city?: string;
      state?: string;
      distance_meters?: number;
      distance_miles?: number;
      moving_time_secs?: number;
      elapsed_time_secs?: number;
      avg_pace_secs_per_mile?: number;
      avg_pace_display?: string;
      elevation_gain_ft?: number;
      max_elevation_ft?: number;
      avg_heart_rate_bpm?: number;
      max_heart_rate_bpm?: number;
      map_polyline?: string;
      photos?: string[];
      kudos_count: number;
      comment_count: number;
      personal_record: boolean;
      kudoed_by_viewer?: boolean;
      owned_by_viewer?: boolean;
      created?: number;
    };
    Comment: {
      object: 'comment';
      id: string;
      activity_id: string;
      user?: components['schemas']['User'];
      content: string;
      created?: number;
    };
    Kudo: {
      object: 'kudo';
      activity_id: string;
      kudoed_by_viewer: boolean;
      kudos_count: number;
    };
    Club: {
      object: 'club';
      id: string;
      name: string;
      description?: string;
      privacy_level: 'public' | 'private';
      created_by_user_id?: string;
      member_count?: number;
      viewer_role?: 'owner' | 'admin' | 'member';
      created?: number;
    };
    ClubMembership: {
      object: 'club_membership';
      club_id: string;
      user?: components['schemas']['User'];
      role: 'owner' | 'admin' | 'member';
      joined?: number;
    };
    Goal: {
      object: 'goal';
      id: string;
      club_id?: string;
      name: string;
      target_distance_miles: number;
      start_date: string;
      end_date: string;
      created?: number;
    };
    GoalProgress: {
      object: 'goal_progress';
      goal_id: string;
      name?: string;
      target_distance_miles: number;
      total_distance_miles: number;
      progress_percent: number;
      start_date?: string;
      end_date?: string;
    };
    LeaderboardEntry: {
      object: 'leaderboard_entry';
      rank: number;
      user?: components['schemas']['User'];
      total_distance_miles: number;
    };
    Follow: {
      object: 'follow';
      follower_id: string;
      following_id: string;
      user?: components['schemas']['User'];
      created?: number;
    };
    ApiError: {
      error: { type: string; code?: string; message?: string };
    };
  };
}
