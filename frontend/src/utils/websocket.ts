type MessageHandler = (message: any) => void;

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface AuthMessage {
  type: 'auth';
  walletAddress: string;
  signature: string;
  timestamp: number;
}

interface SubscribeMessage {
  type: 'subscribe';
  vaultIds: string[];
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  vaultIds: string[];
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private pendingAuth: AuthMessage | null = null;
  private subscribedVaults: Set<string> = new Set();

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Re-authenticate if we have pending auth
          if (this.pendingAuth) {
            this.send(this.pendingAuth);
          }

          // Re-subscribe to vaults
          if (this.subscribedVaults.size > 0) {
            this.subscribe(Array.from(this.subscribedVaults));
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedVaults.clear();
    this.pendingAuth = null;
  }

  /**
   * Authenticate with the WebSocket server
   */
  async authenticate(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>
  ): Promise<void> {
    const timestamp = Date.now();
    const message = `Sign this message to authenticate with Narrative Vaults: ${timestamp}`;
    const signature = await signMessage(message);

    const authMessage: AuthMessage = {
      type: 'auth',
      walletAddress,
      signature,
      timestamp,
    };

    this.pendingAuth = authMessage;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send(authMessage);
    }
  }

  /**
   * Subscribe to vault updates
   */
  subscribe(vaultIds: string[]) {
    vaultIds.forEach(id => this.subscribedVaults.add(id));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        vaultIds,
      };
      this.send(message);
    }
  }

  /**
   * Unsubscribe from vault updates
   */
  unsubscribe(vaultIds: string[]) {
    vaultIds.forEach(id => this.subscribedVaults.delete(id));

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: UnsubscribeMessage = {
        type: 'unsubscribe',
        vaultIds,
      };
      this.send(message);
    }
  }

  /**
   * Register a handler for a specific message type
   */
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Register a handler for all messages
   */
  onAny(handler: MessageHandler) {
    return this.on('*', handler);
  }

  /**
   * Send a message to the server
   */
  private send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage) {
    // Call type-specific handlers
    const typeHandlers = this.handlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => handler(message));
    }

    // Call wildcard handlers
    const allHandlers = this.handlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(message));
    }
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient(WS_BASE_URL);

// Export class for custom instances
export { WebSocketClient };

// Message type constants
export const WS_MESSAGE_TYPES = {
  // Server -> Client
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  ERROR: 'error',
  PNL_UPDATE: 'PNL_UPDATE',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  XP_EARNED: 'XP_EARNED',
  LEVEL_UP: 'LEVEL_UP',

  // Client -> Server
  AUTH: 'auth',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  PONG: 'pong',
} as const;
