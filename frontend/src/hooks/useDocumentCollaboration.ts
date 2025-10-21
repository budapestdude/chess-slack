import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaboratorPresence {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  cursorPosition?: number;
  lastActivity: Date;
}

interface DocumentUpdate {
  documentId: string;
  content: string;
  updatedBy: string;
  timestamp: Date;
}

interface UseDocumentCollaborationProps {
  documentId: string;
  workspaceId: string;
  onRemoteUpdate?: (update: DocumentUpdate) => void;
  onPresenceChange?: (collaborators: CollaboratorPresence[]) => void;
}

export function useDocumentCollaboration({
  documentId,
  workspaceId,
  onRemoteUpdate,
  onPresenceChange,
}: UseDocumentCollaborationProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Connect to Socket.IO
    const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Join document room
      socketInstance.emit('join-document', { documentId, workspaceId });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        socketInstance.close();
      }
    });

    // Document-specific events
    socketInstance.on('document-update', (update: DocumentUpdate) => {
      if (onRemoteUpdate) {
        onRemoteUpdate(update);
      }
    });

    socketInstance.on('document-presence', (collaborators: CollaboratorPresence[]) => {
      setActiveCollaborators(collaborators);
      if (onPresenceChange) {
        onPresenceChange(collaborators);
      }
    });

    socketInstance.on('collaborator-joined', (collaborator: CollaboratorPresence) => {
      setActiveCollaborators((prev) => [...prev, collaborator]);
    });

    socketInstance.on('collaborator-left', (userId: string) => {
      setActiveCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    });

    socketInstance.on('cursor-update', ({ userId, position }: { userId: string; position: number }) => {
      setActiveCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, cursorPosition: position } : c))
      );
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit('leave-document', { documentId });
        socketInstance.close();
      }
    };
  }, [documentId, workspaceId, onRemoteUpdate, onPresenceChange]);

  const broadcastUpdate = (content: string) => {
    if (socket && isConnected) {
      socket.emit('document-update', {
        documentId,
        content,
        timestamp: new Date(),
      });
    }
  };

  const updateCursorPosition = (position: number) => {
    if (socket && isConnected) {
      socket.emit('cursor-update', {
        documentId,
        position,
      });
    }
  };

  const broadcastPresence = () => {
    if (socket && isConnected) {
      socket.emit('document-presence', {
        documentId,
        timestamp: new Date(),
      });
    }
  };

  return {
    socket,
    isConnected,
    activeCollaborators,
    broadcastUpdate,
    updateCursorPosition,
    broadcastPresence,
  };
}
