/**
 * Hand-authored placeholder. Regenerate from the running server with:
 *   npm run gen:api
 */

export interface paths {
  '/v1/activities': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Activity']> } } };
    };
  };
  '/v1/activities/{activityId}': {
    get: {
      parameters: { path: { activityId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Activity'] } } };
    };
    patch: {
      parameters: { path: { activityId: string } };
      requestBody: {
        content: {
          'application/json': { user_note?: string; app_photos?: string[] };
        };
      };
      responses: { 200: { content: { 'application/json': components['schemas']['Activity'] } } };
    };
  };
  '/v1/activities/{activityId}/photos/presign': {
    post: {
      parameters: { path: { activityId: string } };
      requestBody: { content: { 'application/json': { content_type?: string } } };
      responses: {
        200: {
          content: {
            'application/json': {
              upload_url: string;
              public_url: string;
              method: string;
              content_type: string;
            };
          };
        };
      };
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
  '/v1/activities/{activityId}/coach/chat': {
    post: {
      parameters: { path: { activityId: string } };
      requestBody: {
        content: { 'application/json': { message: string } };
      };
      responses: {
        200: { content: { 'application/json': { reply: string } } };
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
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Comment']> } } };
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
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Club']> } } };
    };
  };
  '/v1/clubs/my-clubs': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Club']> } } };
    };
  };
  '/v1/clubs/{clubId}': {
    get: {
      parameters: { path: { clubId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Club'] } } };
    };
    patch: {
      parameters: { path: { clubId: string } };
      requestBody: {
        content: {
          'application/json': {
            name?: string;
            description?: string;
            privacy_level?: 'public' | 'private';
          };
        };
      };
      responses: { 200: { content: { 'application/json': components['schemas']['Club'] } } };
    };
  };
  '/v1/clubs/{clubId}/leaderboard': {
    get: {
      parameters: {
        path: { clubId: string };
        query?: { window?: '30d' | 'all'; goalId?: string; limit?: number };
      };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['LeaderboardEntry']> } };
      };
    };
  };
  '/v1/clubs/{clubId}/members': {
    get: {
      parameters: { path: { clubId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['ClubMembership']> } };
      };
    };
  };
  '/v1/clubs/{clubId}/members/{userId}': {
    patch: {
      parameters: { path: { clubId: string; userId: string } };
      requestBody: { content: { 'application/json': { role: 'owner' | 'admin' | 'member' } } };
      responses: {
        200: { content: { 'application/json': components['schemas']['ClubMembership'] } };
      };
    };
    delete: {
      parameters: { path: { clubId: string; userId: string } };
      responses: { 204: never };
    };
  };
  '/v1/clubs/{clubId}/invitations': {
    post: {
      parameters: { path: { clubId: string } };
      requestBody: { content: { 'application/json': { user_id: string } } };
      responses: {
        201: { content: { 'application/json': components['schemas']['ClubMembership'] } };
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
  '/v1/clubs/{clubId}/feed': {
    get: {
      parameters: { path: { clubId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: {
          content: {
            'application/json': { feed: components['schemas']['ClubFeedItem'][]; total: number };
          };
        };
      };
    };
  };
  '/v1/clubs/{clubId}/posts': {
    post: {
      parameters: { path: { clubId: string } };
      requestBody: {
        content: {
          'application/json': { content: string; photos?: string[]; related_activity_id?: string };
        };
      };
      responses: { 201: { content: { 'application/json': components['schemas']['Post'] } } };
    };
  };
  '/v1/clubs/{clubId}/posts/{postId}': {
    get: {
      parameters: { path: { clubId: string; postId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['Post'] } } };
    };
    patch: {
      parameters: { path: { clubId: string; postId: string } };
      requestBody: { content: { 'application/json': { content?: string; photos?: string[] } } };
      responses: { 200: { content: { 'application/json': components['schemas']['Post'] } } };
    };
    delete: {
      parameters: { path: { clubId: string; postId: string } };
      responses: { 204: never };
    };
  };
  '/v1/clubs/{clubId}/posts/presign': {
    post: {
      parameters: { path: { clubId: string } };
      requestBody: { content: { 'application/json': { content_type?: string } } };
      responses: {
        200: {
          content: {
            'application/json': {
              upload_url: string;
              public_url: string;
              method: string;
              content_type: string;
            };
          };
        };
      };
    };
  };
  '/v1/clubs/{clubId}/goals': {
    get: {
      parameters: { path: { clubId: string } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Goal']> } } };
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
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Goal']> } } };
    };
  };
  '/v1/clubs/{clubId}/goals/{goalId}': {
    patch: {
      parameters: { path: { clubId: string; goalId: string } };
      requestBody: {
        content: {
          'application/json': {
            name?: string;
            target_distance_miles?: number;
            start_date?: string;
            end_date?: string;
          };
        };
      };
      responses: { 200: { content: { 'application/json': components['schemas']['Goal'] } } };
    };
    delete: {
      parameters: { path: { clubId: string; goalId: string } };
      responses: { 204: never };
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
        200: { content: { 'application/json': ApiList<components['schemas']['LeaderboardEntry']> } };
      };
    };
  };
  '/v1/users/me': {
    get: {
      responses: { 200: { content: { 'application/json': components['schemas']['UserProfile'] } } };
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
            privacy_level: 'public' | 'private';
          }>;
        };
      };
      responses: {
        200: { content: { 'application/json': components['schemas']['UserProfile'] } };
      };
    };
  };
  '/v1/users/me/avatar/presign': {
    post: {
      requestBody: { content: { 'application/json': { content_type: string } } };
      responses: {
        200: {
          content: {
            'application/json': {
              upload_url: string;
              public_url: string;
              method: string;
              content_type: string;
            };
          };
        };
      };
    };
  };
  '/v1/users': {
    get: {
      parameters: { query: { q: string; page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['User']> } } };
    };
  };
  '/v1/users/suggested': {
    get: {
      parameters: Record<string, never>;
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['User']> } } };
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
  '/v1/users/{userId}/activities': {
    get: {
      parameters: { path: { userId: string }; query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Activity']> } };
      };
    };
  };
  '/v1/users/{userId}/follow': {
    post: {
      parameters: { path: { userId: string } };
      responses: {
        201: {
          content: {
            'application/json': {
              object: 'follow';
              follower_id: string;
              following_id: string;
              user?: components['schemas']['User'];
              status: 'pending' | 'accepted';
              created?: number;
            };
          };
        };
      };
    };
    delete: { parameters: { path: { userId: string } }; responses: { 204: never } };
  };
  '/v1/users/{userId}/followers': {
    get: {
      parameters: { path: { userId: string }; query?: { page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Follow']> } } };
    };
  };
  '/v1/users/{userId}/following': {
    get: {
      parameters: { path: { userId: string }; query?: { page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Follow']> } } };
    };
  };
  '/v1/follow-requests': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['FollowRequest']> } };
      };
    };
  };
  '/v1/follow-requests/{requestId}/accept': {
    post: {
      parameters: { path: { requestId: string } };
      responses: { 200: { content: { 'application/json': components['schemas']['FollowRequest'] } } };
    };
  };
  '/v1/follow-requests/{requestId}': {
    delete: { parameters: { path: { requestId: string } }; responses: { 204: never } };
  };
  '/v1/feed/home': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: { 200: { content: { 'application/json': ApiList<components['schemas']['Activity']> } } };
    };
  };
  '/v1/me/ai/chat': {
    post: {
      requestBody: {
        content: { 'application/json': { message: string } };
      };
      responses: {
        200: { content: { 'application/json': { reply: string } } };
      };
    };
  };
  '/v1/me/activities/health-import': {
    post: {
      requestBody: {
        content: {
          'application/json': { workouts: components['schemas']['HealthWorkoutImportItem'][] };
        };
      };
      responses: {
        200: {
          content: {
            'application/json': { imported: number; skipped: number };
          };
        };
      };
    };
  };
  '/v1/me/training-goal': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['TrainingGoalResponse'];
          };
        };
      };
    };
    put: {
      requestBody: {
        content: { 'application/json': { goal_text?: string } };
      };
      responses: {
        200: {
          content: {
            'application/json': components['schemas']['TrainingGoalResponse'];
          };
        };
      };
    };
  };
  '/v1/me/training-goal/feedback': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: {
          content: {
            'application/json': ApiList<components['schemas']['GoalFeedbackMessage']>;
          };
        };
      };
    };
    post: {
      requestBody: {
        content: { 'application/json': { message: string } };
      };
      responses: {
        200: { content: { 'application/json': { reply: string } } };
      };
    };
    delete: {
      responses: {
        200: { content: { 'application/json': { deleted: number } } };
      };
    };
  };
  '/v1/me/training-today': {
    get: {
      responses: {
        200: { content: { 'application/json': components['schemas']['TrainingToday'] } };
      };
    };
  };
  '/v1/notifications': {
    get: {
      parameters: { query?: { page?: number; limit?: number } };
      responses: {
        200: { content: { 'application/json': ApiList<components['schemas']['Notification']> } };
      };
    };
  };
  '/v1/notifications/preview': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': {
              unread_count: number;
              latest: components['schemas']['Notification'] | null;
            };
          };
        };
      };
    };
  };
  '/v1/notifications/read-all': {
    post: {
      responses: {
        200: { content: { 'application/json': { updated: number } } };
      };
    };
  };
  '/v1/notifications/{id}/read': {
    patch: {
      parameters: { path: { id: string } };
      responses: {
        200: { content: { 'application/json': components['schemas']['Notification'] } };
      };
    };
  };
  '/v1/strava/auth': {
    get: { responses: { 200: { content: { 'application/json': { authorization_url: string } } } } };
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
      /** Sum of moving time for activities started in the last 30 days. */
      moving_seconds_30d?: number;
    };
    UserProfile: {
      object: 'user_profile';
      id: string;
      name?: string;
      avatar_url?: string;
      bio?: string;
      city?: string;
      state?: string;
      privacy_level: 'public' | 'private';
      strava_connected: boolean;
      followers_count: number;
      following_count: number;
      is_self: boolean;
      follow_status: 'self' | 'none' | 'pending' | 'accepted';
      stats: components['schemas']['UserStats'];
    };
    HealthWorkoutImportItem: {
      import_source: 'apple_health' | 'health_connect';
      external_id: string;
      name: string;
      start_date_epoch_seconds: number;
      distance_meters?: number;
      moving_time_secs?: number;
      map_polyline?: string;
      elevation_gain_ft?: number;
      avg_heart_rate_bpm?: number;
      max_heart_rate_bpm?: number;
    };
    Activity: {
      object: 'activity';
      id: string;
      strava_id?: number;
      import_source?: string;
      import_external_id?: string;
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
      user_note?: string;
      app_photos?: string[];
      kudos_count: number;
      comment_count: number;
      personal_record: boolean;
      /** Coach blurb from telemetry; set after Strava import when AI is configured. */
      ai_coach_summary?: string | null;
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
      /** Unix seconds; goal credit uses goal dates, not join time */
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
    FollowRequest: {
      object: 'follow_request';
      id: string;
      requester?: components['schemas']['User'];
      status: 'pending';
      created?: number;
    };
    Post: {
      object: 'post';
      id: string;
      club_id: string;
      author?: components['schemas']['User'];
      content: string;
      photos?: string[];
      related_activity_id?: string;
      created?: number;
    };
    /**
     * Mixed feed item (post or activity). Backend currently emits a loose
     * shape; check `type` to discriminate.
     */
    ClubFeedItem: {
      type: 'post' | 'activity';
      id: string;
      [key: string]: unknown;
    };
    ApiError: { error: { type: string; code?: string; message?: string } };
    TrainingGoalResponse: {
      goal_text: string;
      interpretation_json?: string | null;
      interpretation?: Record<string, unknown> | null;
      interpretation_updated_at?: string | null;
      daily_plan?: {
        plan_date: string;
        headline: string;
        generated_at: string;
        body: Record<string, unknown>;
      } | null;
    };
    TrainingToday: {
      headline: string;
      bullets: string[];
      progress_hint?: string;
      primary_session?: string;
      rationale?: string;
      plan_date?: string;
      generated_at?: string;
    };
    Notification: {
      id: string;
      type: string;
      title: string;
      body: string;
      payload_json?: string | null;
      related_activity_id?: string | null;
      read_at?: string | null;
      created_at: string;
    };
    GoalFeedbackMessage: {
      id: string;
      role: 'user' | 'assistant';
      content: string;
      created_at: string;
    };
  };
}
