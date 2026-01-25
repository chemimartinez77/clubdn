// client/src/api/notifications.ts
import { api } from './axios';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface NotificationActionResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Get user notifications
 */
export const getNotifications = async (unreadOnly = false): Promise<NotificationsResponse> => {
  const response = await api.get(`/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
  return response.data;
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get('/api/notifications/unread-count');
  return response.data;
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (id: string): Promise<NotificationActionResponse> => {
  const response = await api.patch(`/api/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<NotificationActionResponse> => {
  const response = await api.patch('/api/notifications/mark-all-read');
  return response.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id: string): Promise<NotificationActionResponse> => {
  const response = await api.delete(`/api/notifications/${id}`);
  return response.data;
};
