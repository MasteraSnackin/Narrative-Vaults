import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { verifyMessage } from 'viem';

// Extended WebSocket with user info
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  walletAddress?: string;
  subscribedVaults?: Set<string>;
  isAlive?: boolean;
}

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

let wss: WebSocketServer | null = null;
const MESSAGE_PREFIX = 'Sign this message to authenticate with Narrative Vaults: ';

// Ping interval to detect dead connections
let pingInterval: NodeJS.Timeout | null = null;
const PING_INTERVAL_MS = 30000;

export function initializeWebSocketServer(server: http.Server) {
  if (wss) {
    console.log('[WebSocket] Server already initialized.');
    return wss;
  }

  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    console.log('[WebSocket] Client connected');

    ws.isAlive = true;
    ws.subscribedVaults = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected${ws.walletAddress ? ` (${ws.walletAddress})` : ''}`);
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket] Error handling message:', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Narrative Vaults WebSocket',
      timestamp: new Date().toISOString()
    }));
  });

  // Setup ping interval
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    wss?.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        console.log('[WebSocket] Terminating dead connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, PING_INTERVAL_MS);

  console.log('[WebSocket] Server initialized');
  return wss;
}

async function handleMessage(ws: AuthenticatedWebSocket, message: any) {
  switch (message.type) {
    case 'auth':
      await handleAuth(ws, message as AuthMessage);
      break;
    case 'subscribe':
      handleSubscribe(ws, message as SubscribeMessage);
      break;
    case 'unsubscribe':
      handleUnsubscribe(ws, message as UnsubscribeMessage);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    default:
      sendError(ws, `Unknown message type: ${message.type}`);
  }
}

async function handleAuth(ws: AuthenticatedWebSocket, message: AuthMessage) {
  try {
    const { walletAddress, signature, timestamp } = message;

    // Validate timestamp
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (Math.abs(now - timestamp) > fiveMinutes) {
      sendError(ws, 'Authentication timestamp expired');
      return;
    }

    // Verify signature
    const authMessage = `${MESSAGE_PREFIX}${timestamp}`;
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: authMessage,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      sendError(ws, 'Invalid signature');
      return;
    }

    // Set authenticated state
    ws.walletAddress = walletAddress.toLowerCase();
    ws.userId = walletAddress.toLowerCase();

    ws.send(JSON.stringify({
      type: 'authenticated',
      walletAddress: ws.walletAddress,
      timestamp: new Date().toISOString()
    }));

    console.log(`[WebSocket] Client authenticated: ${ws.walletAddress}`);
  } catch (error) {
    console.error('[WebSocket] Auth error:', error);
    sendError(ws, 'Authentication failed');
  }
}

function handleSubscribe(ws: AuthenticatedWebSocket, message: SubscribeMessage) {
  if (!ws.subscribedVaults) {
    ws.subscribedVaults = new Set();
  }

  const { vaultIds } = message;
  vaultIds.forEach(id => ws.subscribedVaults!.add(id));

  ws.send(JSON.stringify({
    type: 'subscribed',
    vaultIds: Array.from(ws.subscribedVaults),
    timestamp: new Date().toISOString()
  }));

  console.log(`[WebSocket] Client subscribed to vaults: ${vaultIds.join(', ')}`);
}

function handleUnsubscribe(ws: AuthenticatedWebSocket, message: UnsubscribeMessage) {
  if (!ws.subscribedVaults) return;

  const { vaultIds } = message;
  vaultIds.forEach(id => ws.subscribedVaults!.delete(id));

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    vaultIds: vaultIds,
    remaining: Array.from(ws.subscribedVaults),
    timestamp: new Date().toISOString()
  }));
}

function sendError(ws: WebSocket, error: string) {
  ws.send(JSON.stringify({
    type: 'error',
    error: error,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Broadcast a message to clients
 * @param recipientId - 'all', a wallet address, or a vault ID
 * @param message - The message to broadcast
 */
export function broadcastMessage(recipientId: string | 'all', message: WebSocketMessage) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized. Cannot broadcast message.');
    return;
  }

  let sentCount = 0;

  wss.clients.forEach((client: AuthenticatedWebSocket) => {
    if (client.readyState !== WebSocket.OPEN) return;

    let shouldSend = false;

    if (recipientId === 'all') {
      shouldSend = true;
    } else if (client.walletAddress === recipientId.toLowerCase()) {
      shouldSend = true;
    } else if (client.subscribedVaults?.has(recipientId)) {
      shouldSend = true;
    }

    if (shouldSend) {
      client.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`[WebSocket] Broadcasted ${message.type} to ${sentCount} client(s)`);
  }
}

/**
 * Send a message to a specific user by wallet address
 */
export function sendToUser(walletAddress: string, message: WebSocketMessage) {
  broadcastMessage(walletAddress.toLowerCase(), message);
}

/**
 * Send a message to all users subscribed to a vault
 */
export function sendToVaultSubscribers(vaultId: string, message: WebSocketMessage) {
  broadcastMessage(vaultId, message);
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  authenticatedConnections: number;
  subscriptions: Record<string, number>;
} {
  if (!wss) {
    return { totalConnections: 0, authenticatedConnections: 0, subscriptions: {} };
  }

  let totalConnections = 0;
  let authenticatedConnections = 0;
  const subscriptions: Record<string, number> = {};

  wss.clients.forEach((client: AuthenticatedWebSocket) => {
    totalConnections++;
    if (client.walletAddress) {
      authenticatedConnections++;
    }
    client.subscribedVaults?.forEach(vaultId => {
      subscriptions[vaultId] = (subscriptions[vaultId] || 0) + 1;
    });
  });

  return { totalConnections, authenticatedConnections, subscriptions };
}

/**
 * Close the WebSocket server
 */
export function closeWebSocketServer() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  if (wss) {
    wss.close();
    wss = null;
    console.log('[WebSocket] Server closed');
  }
}
