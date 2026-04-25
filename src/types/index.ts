export interface User {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface Activity {
  id: string;
  userId: string;
  user: User;
  distance: number;
  duration: number;
  pace: number;
  timestamp: Date;
  title: string;
  route?: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  };
  kudos: number;
  comments: number;
  streak?: number;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  members: User[];
  memberCount: number;
  totalDistance: number;
  goal?: {
    target: number;
    progress: number;
    unit: 'miles' | 'km';
  };
  createdAt: Date;
}
