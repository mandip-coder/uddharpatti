import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  receivedAt: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'read' | 'receivedAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (data) => set((state) => {
    const notificationId = (data as any).notificationId || uuidv4();

    // RULE 6: Deduplication Check
    const isDuplicate = state.notifications.some(n => n.id === notificationId);
    if (isDuplicate) return state;

    const newNotification: Notification = {
      id: notificationId,
      ...data,
      time: 'Just now',
      read: false,
      receivedAt: Date.now(),
    };

    const updatedNotifications = [newNotification, ...state.notifications];

    return {
      notifications: updatedNotifications,
      unreadCount: state.unreadCount + 1
    };
  }),

  markAsRead: (id) => set((state) => {
    const updatedNotifications = state.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    return { notifications: updatedNotifications, unreadCount };
  }),

  markAllAsRead: () => set((state) => {
    const updatedNotifications = state.notifications.map(n => ({ ...n, read: true }));
    return { notifications: updatedNotifications, unreadCount: 0 };
  }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  removeNotification: (id) => set((state) => {
    const updatedNotifications = state.notifications.filter(n => n.id !== id);
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    return { notifications: updatedNotifications, unreadCount };
  })
}));
