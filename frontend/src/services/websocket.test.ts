import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('WebSocketService', () => {
  let mockSocket: any;
  let WebSocketService: any;
  let websocketService: any;

  beforeEach(async () => {
    // Reset modules to get fresh instance
    vi.resetModules();

    // Create mock socket
    mockSocket = {
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    // Mock io to return our mock socket
    (io as any).mockReturnValue(mockSocket);

    // Import service after mocking
    const module = await import('./websocket');
    WebSocketService = module.default;
    websocketService = module.websocketService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('creates a socket connection with auth token', () => {
      const token = 'test-token';
      websocketService.connect(token);

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token },
          transports: ['websocket', 'polling'],
        })
      );
    });

    it('does not create duplicate connection if already connected', () => {
      mockSocket.connected = true;
      const token = 'test-token';

      websocketService.connect(token);
      websocketService.connect(token);

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('sets up connection event listeners', () => {
      websocketService.connect('test-token');

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('disconnects the socket', () => {
      websocketService.connect('test-token');
      websocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('joinChannel', () => {
    it('emits join-channel event', async () => {
      websocketService.connect('test-token');

      const channelId = 'channel-123';
      const promise = websocketService.joinChannel(channelId);

      // Get the callback that was passed to emit
      const emitCall = mockSocket.emit.mock.calls.find(
        (call: any[]) => call[0] === 'join-channel'
      );
      expect(emitCall).toBeDefined();
      expect(emitCall[1]).toBe(channelId);

      // Simulate server response
      const callback = emitCall[2];
      callback(true);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('returns false if socket is not connected', async () => {
      const result = await websocketService.joinChannel('channel-123');
      expect(result).toBe(false);
    });
  });

  describe('joinDM', () => {
    it('emits join-dm event', async () => {
      websocketService.connect('test-token');

      const dmGroupId = 'dm-123';
      const promise = websocketService.joinDM(dmGroupId);

      const emitCall = mockSocket.emit.mock.calls.find(
        (call: any[]) => call[0] === 'join-dm'
      );
      expect(emitCall).toBeDefined();
      expect(emitCall[1]).toBe(dmGroupId);

      const callback = emitCall[2];
      callback(true);

      const result = await promise;
      expect(result).toBe(true);
    });
  });

  describe('sendTyping', () => {
    it('emits typing event with channel ID', () => {
      websocketService.connect('test-token');

      const channelId = 'channel-123';
      websocketService.sendTyping(channelId);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', { channelId });
    });
  });

  describe('stopTyping', () => {
    it('emits stop-typing event with channel ID', () => {
      websocketService.connect('test-token');

      const channelId = 'channel-123';
      websocketService.stopTyping(channelId);

      expect(mockSocket.emit).toHaveBeenCalledWith('stop-typing', { channelId });
    });
  });

  describe('message event listeners', () => {
    it('sets up new-message listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onNewMessage(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('new-message', callback);
    });

    it('removes new-message listener', () => {
      websocketService.connect('test-token');

      websocketService.offNewMessage();

      expect(mockSocket.off).toHaveBeenCalledWith('new-message');
    });

    it('sets up message-updated listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onMessageUpdated(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('message-updated', callback);
    });

    it('sets up message-deleted listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onMessageDeleted(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('message-deleted', callback);
    });
  });

  describe('typing event listeners', () => {
    it('sets up user-typing listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onUserTyping(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('user-typing', callback);
    });

    it('removes user-typing listener', () => {
      websocketService.connect('test-token');

      websocketService.offUserTyping();

      expect(mockSocket.off).toHaveBeenCalledWith('user-typing');
    });
  });

  describe('reaction event listeners', () => {
    it('sets up reaction-added listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onReactionAdded(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('reaction-added', callback);
    });

    it('removes reaction-added listener', () => {
      websocketService.connect('test-token');

      websocketService.offReactionAdded();

      expect(mockSocket.off).toHaveBeenCalledWith('reaction-added');
    });
  });

  describe('presence', () => {
    it('emits set-presence event', () => {
      websocketService.connect('test-token');

      websocketService.setPresence('away');

      expect(mockSocket.emit).toHaveBeenCalledWith('set-presence', { status: 'away' });
    });

    it('sets up presence-changed listener', () => {
      websocketService.connect('test-token');

      const callback = vi.fn();
      websocketService.onPresenceChanged(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('presence-changed', callback);
    });
  });

  describe('getSocket', () => {
    it('returns the socket instance', () => {
      websocketService.connect('test-token');

      const socket = websocketService.getSocket();

      expect(socket).toBe(mockSocket);
    });

    it('returns null if not connected', () => {
      const socket = websocketService.getSocket();

      expect(socket).toBeNull();
    });
  });
});