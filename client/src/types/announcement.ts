// client/src/types/announcement.ts

export interface Announcement {
  id: string;
  title: string | null;
  content: string;
  pinned: boolean;
  authorId: string;
  author: { id: string; name: string };
  likeCount: number;
  userHasLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementFormData {
  title?: string;
  content: string;
  pinned?: boolean;
}
