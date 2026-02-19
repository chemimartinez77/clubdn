// client/src/components/notifications/NotificationBell.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '../../api/notifications';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(
        notifications.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (notification && !notification.read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída si no lo está
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        setNotifications(
          notifications.map(n => n.id === notification.id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    setIsOpen(false);

    // Navegar según el tipo de notificación
    switch (notification.type) {
      case 'ADMIN_NEW_USER':
        navigate('/admin/pending-approvals', { state: { refreshPending: true } });
        break;

      case 'EVENT_CREATED':
      case 'EVENT_CANCELLED':
      case 'EVENT_MODIFIED':
      case 'EVENT_REMINDER':
      case 'REGISTRATION_APPROVED':
      case 'REGISTRATION_REJECTED':
      case 'REGISTRATION_PENDING':
        // Navegar a detalle del evento usando metadata.eventId
        if (notification.metadata && typeof notification.metadata === 'object') {
          const metadata = notification.metadata as { eventId?: string };
          if (metadata.eventId) {
            navigate(`/events/${metadata.eventId}`);
          }
        }
        break;

      case 'REPORT_CREATED':
      case 'REPORT_UPDATED':
      case 'REPORT_COMMENT':
        if (notification.metadata && typeof notification.metadata === 'object') {
          const metadata = notification.metadata as { reportId?: string };
          if (metadata.reportId) {
            navigate(`/feedback?report=${metadata.reportId}`);
            break;
          }
        }
        navigate('/feedback');
        break;

      default:
        // No hay navegación para otros tipos
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_CANCELLED':
        return String.fromCodePoint(0x1F6AB); // 🚫
      case 'EVENT_MODIFIED':
        return String.fromCodePoint(0x1F527); // 🔧
      case 'EVENT_CREATED':
        return String.fromCodePoint(0x1F4C5); // 📅
      case 'EVENT_REMINDER':
        return String.fromCodePoint(0x23F0); // ⏰
      case 'USER_APPROVED':
        return String.fromCodePoint(0x2705); // ✅
      case 'USER_REJECTED':
        return String.fromCodePoint(0x274C); // ❌
      case 'ADMIN_NEW_USER':
        return String.fromCodePoint(0x1F464); // 👤
      case 'INVITATION_VALIDATED':
        return String.fromCodePoint(0x1F4E9); // 📩
      case 'INVITATION_REJECTED':
        return String.fromCodePoint(0x1F4E4); // 📤
      case 'WAITLIST_SPOT_AVAILABLE':
        return String.fromCodePoint(0x1F6AA); // 🚪
      case 'REGISTRATION_PENDING':
        return String.fromCodePoint(0x23F3); // ⏳
      case 'REGISTRATION_APPROVED':
        return String.fromCodePoint(0x2705); // ✅
      case 'REGISTRATION_REJECTED':
        return String.fromCodePoint(0x274C); // ❌
      case 'REPORT_CREATED':
        return String.fromCodePoint(0x1F4DD); // 📝
      case 'REPORT_UPDATED':
        return String.fromCodePoint(0x1F504); // 🔄
      case 'REPORT_COMMENT':
        return String.fromCodePoint(0x1F4AC); // 💬
      default:
        return String.fromCodePoint(0x1F514); // 🔔
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--color-textSecondary)] hover:text-primary transition-colors rounded-lg hover:bg-[var(--color-tableRowHover)]"
        aria-label="Notificaciones"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-[var(--color-cardBackground)] rounded-lg shadow-lg border border-[var(--color-cardBorder)] z-20 max-h-[32rem] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-cardBorder)]">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Notificaciones</h3>
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  {'Marcar todas como leida'}
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <svg className="w-16 h-16 text-[var(--color-textSecondary)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-[var(--color-textSecondary)]">No tienes notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    className={`p-4 border-b border-[var(--color-cardBorder)] hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer ${
                      !notification.read ? 'bg-[var(--color-tableRowHover)]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="text-[var(--color-textSecondary)] hover:text-red-500 transition-colors flex-shrink-0"
                            aria-label="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-[var(--color-textSecondary)] mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[var(--color-textSecondary)]">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              {'Marcar como leida'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

