export interface PhotoLibraryGameOption {
  bggId: string;
  gameName: string;
  gameImage: string | null;
}

export interface PhotoLibraryParticipantOption {
  id: string;
  name: string;
  nick: string | null;
  avatar: string | null;
}

export interface PhotoLibraryPhoto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
    gameName: string | null;
    gameImage: string | null;
    bggId: string | null;
  };
}

export interface PhotoLibraryResponse {
  photos: PhotoLibraryPhoto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
