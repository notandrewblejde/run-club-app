import { create } from 'zustand';
import { Activity } from '@/types';
import apiClient from '@/utils/apiClient';

interface ActivityState {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  fetchActivities: (page?: number) => Promise<void>;
  refreshActivities: () => Promise<void>;
  addActivity: (activity: Activity) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  loading: false,
  error: null,
  page: 0,
  hasMore: true,

  fetchActivities: async (pageNum?: number) => {
    const currentPage = pageNum ?? get().page;

    try {
      set({ loading: true, error: null });
      const response = await apiClient.get('/v1/activities', {
        params: { page: currentPage, limit: 20 },
      });

      const newActivities = response.data.activities || [];
      set((state) => ({
        activities:
          currentPage === 0 ? newActivities : [...state.activities, ...newActivities],
        page: currentPage + 1,
        hasMore: newActivities.length === 20,
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to load activities', loading: false });
      console.error('Error fetching activities:', error);
    }
  },

  refreshActivities: async () => {
    set({ page: 0, activities: [], hasMore: true });
    await get().fetchActivities(0);
  },

  addActivity: (activity) => {
    set((state) => ({
      activities: [activity, ...state.activities],
    }));
  },
}));
