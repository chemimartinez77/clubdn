// client/src/types/profile.ts
import type { User } from './auth';

export interface UserProfile {
  id: string;
  userId: string;
  avatar: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dni?: string | null;
  dniNormalized?: string | null;
  imageConsentActivities?: boolean;
  imageConsentSocial?: boolean;
  phone: string | null;
  birthDate: string | null;
  bio: string | null;
  favoriteGames: string[];
  playStyle: string | null;
  discord: string | null;
  telegram: string | null;
  notifications: boolean;
  emailUpdates: boolean;
  notifyNewEvents: boolean;
  notifyEventChanges: boolean;
  notifyEventCancelled: boolean;
  notifyInvitations: boolean;
  allowEventInvitations: boolean;
  noughterColor: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface UpdateProfileData {
  avatar?: string;
  phone?: string;
  birthDate?: string;
  bio?: string;
  favoriteGames?: string[];
  playStyle?: string;
  discord?: string;
  telegram?: string;
  notifications?: boolean;
  emailUpdates?: boolean;
  notifyNewEvents?: boolean;
  notifyEventChanges?: boolean;
  notifyEventCancelled?: boolean;
  notifyInvitations?: boolean;
  allowEventInvitations?: boolean;
  noughterColor?: string | null;
}
