import { create } from 'zustand';
import { Activity } from '@/types';

interface ActivityState {
  activities: Activity[];
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) => {
    set((state) => ({
      activities: [activity, ...state.activities],
    }));
  },
}));
