import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { notificationService } from '../services/notification';
import websocketService from '../services/websocket';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadUnreadCount();

      // Listen for new notifications via WebSocket
      const handleNewNotification = () => {
        setUnreadCount((prev) => prev + 1);
      };

      websocketService.getSocket()?.on('new-notification', handleNewNotification);

      return () => {
        websocketService.getSocket()?.off('new-notification', handleNewNotification);
      };
    }
  }, [workspaceId]);

  const loadUnreadCount = async () => {
    if (!workspaceId) return;

    try {
      const count = await notificationService.getUnreadCount(workspaceId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleBellClick = () => {
    setShowPanel(!showPanel);
  };

  const handleNotificationRead = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  if (!workspaceId) return null;

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <NotificationPanel
          workspaceId={workspaceId}
          onClose={() => setShowPanel(false)}
          onNotificationRead={handleNotificationRead}
          onMarkAllRead={handleMarkAllRead}
        />
      )}
    </div>
  );
}