import { useNotifications as useNotificationContext } from '@/contexts/NotificationContext';

// Re-export for convenience, but also add some utility functions
export function useNotifications() {
  const context = useNotificationContext();

  // Helper functions for common notification types
  const showSuccess = (title: string, description?: string, duration?: number) => {
    return context.addNotification({ type: 'success', title, description, duration });
  };

  const showError = (title: string, description?: string, duration?: number) => {
    return context.addNotification({ type: 'error', title, description, duration });
  };

  const showWarning = (title: string, description?: string, duration?: number) => {
    return context.addNotification({ type: 'warning', title, description, duration });
  };

  const showInfo = (title: string, description?: string, duration?: number) => {
    return context.addNotification({ type: 'info', title, description, duration });
  };

  // Helper for confirmation dialogs
  const showConfirm = async (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'default';
  }): Promise<boolean> => {
    return context.showConfirm({
      ...options,
      onConfirm: () => {},
      onCancel: () => {},
    });
  };

  return {
    ...context,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
}
