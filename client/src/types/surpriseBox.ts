export type SurpriseBoxStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';

export interface SurpriseBoxOption {
  id: string;
  position: number;
  gameId: string;
  gameName: string;
  gameImage: string | null;
  gameThumbnail: string | null;
  isWinner: boolean;
}

export interface SurpriseBoxResolvedEvent {
  id: string;
  title: string;
  date: string;
  gameName: string | null;
  gameImage: string | null;
}

export interface SurpriseBox {
  id: string;
  token: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImageUrl: string | null;
  status: SurpriseBoxStatus;
  eventDate: string;
  startHour: number | null;
  startMinute: number | null;
  durationHours: number | null;
  durationMinutes: number | null;
  location: string;
  address: string | null;
  maxAttendees: number;
  requiresApproval: boolean;
  allowLateJoin: boolean;
  language: string;
  englishLevel: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  publicUrl: string;
  previewUrl: string;
  createdBy: {
    id: string;
    name: string;
  };
  options: SurpriseBoxOption[];
  winningOptionId: string | null;
  resolvedEvent: SurpriseBoxResolvedEvent | null;
}
