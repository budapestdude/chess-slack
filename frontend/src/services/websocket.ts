import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['polling', 'websocket'],
      upgrade: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinWorkspace(workspaceId: string) {
    this.socket?.emit('join-workspace', workspaceId);
  }

  leaveWorkspace(workspaceId: string) {
    this.socket?.emit('leave-workspace', workspaceId);
  }

  joinChannel(channelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      this.socket.emit('join-channel', channelId, (success: boolean) => {
        console.log(`Joined channel ${channelId}: ${success}`);
        resolve(success);
      });
    });
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('leave-channel', channelId);
  }

  joinDM(dmGroupId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      this.socket.emit('join-dm', dmGroupId, (success: boolean) => {
        console.log(`Joined DM ${dmGroupId}: ${success}`);
        resolve(success);
      });
    });
  }

  leaveDM(dmGroupId: string) {
    this.socket?.emit('leave-dm', dmGroupId);
  }

  sendTyping(channelId: string) {
    this.socket?.emit('typing', { channelId });
  }

  stopTyping(channelId: string) {
    this.socket?.emit('stop-typing', { channelId });
  }

  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new-message', callback);
  }

  onMessageUpdated(callback: (message: Message) => void) {
    this.socket?.on('message-updated', callback);
  }

  onMessageDeleted(callback: (data: { id: string; channelId: string }) => void) {
    this.socket?.on('message-deleted', callback);
  }

  onUserTyping(callback: (data: { user: any; channelId: string }) => void) {
    this.socket?.on('user-typing', callback);
  }

  onUserStopTyping(callback: (data: { user: any; channelId: string }) => void) {
    this.socket?.on('user-stop-typing', callback);
  }

  offNewMessage() {
    this.socket?.off('new-message');
  }

  offMessageUpdated() {
    this.socket?.off('message-updated');
  }

  offMessageDeleted() {
    this.socket?.off('message-deleted');
  }

  offUserTyping() {
    this.socket?.off('user-typing');
  }

  offUserStopTyping() {
    this.socket?.off('user-stop-typing');
  }

  onReactionAdded(callback: (data: { messageId: string; reaction: any }) => void) {
    this.socket?.on('reaction-added', callback);
  }

  onReactionRemoved(callback: (data: { messageId: string; emoji: string; userId: string }) => void) {
    this.socket?.on('reaction-removed', callback);
  }

  offReactionAdded() {
    this.socket?.off('reaction-added');
  }

  offReactionRemoved() {
    this.socket?.off('reaction-removed');
  }

  setPresence(status: 'online' | 'away' | 'busy' | 'offline') {
    this.socket?.emit('set-presence', { status });
  }

  onPresenceChanged(callback: (data: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status: string;
  }) => void) {
    this.socket?.on('presence-changed', callback);
  }

  offPresenceChanged() {
    this.socket?.off('presence-changed');
  }

  onUserProfileUpdated(callback: (data: any) => void) {
    this.socket?.on('user-profile-updated', callback);
  }

  offUserProfileUpdated() {
    this.socket?.off('user-profile-updated');
  }

  onUserStatusUpdated(callback: (data: { userId: string; customStatus?: string; statusEmoji?: string }) => void) {
    this.socket?.on('user-status-updated', callback);
  }

  offUserStatusUpdated() {
    this.socket?.off('user-status-updated');
  }

  onMessagePinned(callback: (data: { messageId: string; message: Message }) => void) {
    this.socket?.on('message-pinned', callback);
  }

  onMessageUnpinned(callback: (data: { messageId: string }) => void) {
    this.socket?.on('message-unpinned', callback);
  }

  offMessagePinned() {
    this.socket?.off('message-pinned');
  }

  offMessageUnpinned() {
    this.socket?.off('message-unpinned');
  }

  getSocket() {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;