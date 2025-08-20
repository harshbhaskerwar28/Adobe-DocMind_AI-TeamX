import React, { createContext, useContext, useState, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface ConfirmationDialog {
  id: string;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  notifications: Notification[];
  confirmDialog: ConfirmationDialog | null;
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  showConfirm: (dialog: Omit<ConfirmationDialog, 'id'>) => Promise<boolean>;
  hideConfirm: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showConfirm = useCallback((dialog: Omit<ConfirmationDialog, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const confirmDialog: ConfirmationDialog = {
        ...dialog,
        id,
        onConfirm: () => {
          dialog.onConfirm();
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          dialog.onCancel?.();
          setConfirmDialog(null);
          resolve(false);
        },
      };

      setConfirmDialog(confirmDialog);
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const value: NotificationContextType = {
    notifications,
    confirmDialog,
    addNotification,
    removeNotification,
    showConfirm,
    hideConfirm,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
