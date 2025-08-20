import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from './button';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

const notificationIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const notificationStyles = {
  success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100',
  error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100',
};

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function NotificationSystem() {
  const { notifications, removeNotification, confirmDialog, hideConfirm } = useNotifications();

  return (
    <>
      {/* Notification Container - positioned at top center */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-sm sm:max-w-md md:max-w-lg w-full px-4">
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type];
            
            return (
              <div
                key={notification.id}
                className={cn(
                  'relative rounded-xl border-2 p-4 shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 fade-in',
                  notificationStyles[notification.type]
                )}
              >
                {/* Glowing effect border */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20 pointer-events-none" />
                
                <div className="flex items-start space-x-3">
                  <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconStyles[notification.type])} />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold leading-tight">
                      {notification.title}
                    </h4>
                    {notification.description && (
                      <p className="mt-1 text-xs opacity-90">
                        {notification.description}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity"
                    onClick={() => removeNotification(notification.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => hideConfirm()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              {confirmDialog?.variant === 'destructive' && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span>{confirmDialog?.title}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {confirmDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={confirmDialog?.onCancel}>
              {confirmDialog?.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog?.onConfirm}
              className={cn(
                confirmDialog?.variant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {confirmDialog?.confirmText || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
