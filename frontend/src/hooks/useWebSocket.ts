import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient, WS_MESSAGE_TYPES } from '../utils/websocket';

interface PnLUpdate {
  vaultId: string;
  currentPnL: number;
  currentValue: number;
  drawdown: number;
  timestamp: string;
}

interface SystemAlert {
  vaultId: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
}

interface XPEarned {
  userId: string;
  vaultId: string | null;
  xpAmount: number;
  totalXp: number;
  message: string;
}

interface LevelUp {
  userId: string;
  oldLevel: number;
  newLevel: number;
  message: string;
}

// Main WebSocket connection hook
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Connect on mount
    wsClient.connect().catch(console.error);

    // Listen for connection status
    const unsubConnected = wsClient.on(WS_MESSAGE_TYPES.CONNECTED, () => {
      setIsConnected(true);
    });

    const unsubAuthenticated = wsClient.on(WS_MESSAGE_TYPES.AUTHENTICATED, () => {
      setIsAuthenticated(true);
    });

    const unsubError = wsClient.on(WS_MESSAGE_TYPES.ERROR, (msg) => {
      console.error('[WebSocket] Error:', msg.error);
    });

    // Check connection on interval
    const interval = setInterval(() => {
      setIsConnected(wsClient.isConnected());
    }, 5000);

    return () => {
      unsubConnected();
      unsubAuthenticated();
      unsubError();
      clearInterval(interval);
    };
  }, []);

  const authenticate = useCallback(
    async (walletAddress: string, signMessage: (message: string) => Promise<string>) => {
      await wsClient.authenticate(walletAddress, signMessage);
    },
    []
  );

  const subscribe = useCallback((vaultIds: string[]) => {
    wsClient.subscribe(vaultIds);
  }, []);

  const unsubscribe = useCallback((vaultIds: string[]) => {
    wsClient.unsubscribe(vaultIds);
  }, []);

  return {
    isConnected,
    isAuthenticated,
    authenticate,
    subscribe,
    unsubscribe,
  };
}

// Hook for subscribing to vault P&L updates
export function useVaultPnLUpdates(
  vaultId: string | undefined,
  onUpdate?: (update: PnLUpdate) => void
) {
  const [latestUpdate, setLatestUpdate] = useState<PnLUpdate | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!vaultId) return;

    // Subscribe to vault
    wsClient.subscribe([vaultId]);

    // Listen for P&L updates
    const unsub = wsClient.on(WS_MESSAGE_TYPES.PNL_UPDATE, (msg) => {
      if (msg.vaultId === vaultId) {
        const update: PnLUpdate = {
          vaultId: msg.vaultId,
          currentPnL: msg.currentPnL,
          currentValue: msg.currentValue,
          drawdown: msg.drawdown,
          timestamp: msg.timestamp,
        };
        setLatestUpdate(update);
        onUpdateRef.current?.(update);
      }
    });

    return () => {
      unsub();
      wsClient.unsubscribe([vaultId]);
    };
  }, [vaultId]);

  return latestUpdate;
}

// Hook for system alerts
export function useSystemAlerts(vaultIds?: string[]) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    if (vaultIds && vaultIds.length > 0) {
      wsClient.subscribe(vaultIds);
    }

    const unsub = wsClient.on(WS_MESSAGE_TYPES.SYSTEM_ALERT, (msg) => {
      if (!vaultIds || vaultIds.includes(msg.vaultId)) {
        const alert: SystemAlert = {
          vaultId: msg.vaultId,
          severity: msg.severity,
          message: msg.message,
          timestamp: msg.timestamp,
        };
        setAlerts((prev) => [...prev, alert]);
      }
    });

    return () => {
      unsub();
      if (vaultIds && vaultIds.length > 0) {
        wsClient.unsubscribe(vaultIds);
      }
    };
  }, [vaultIds?.join(',')]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((index: number) => {
    setAlerts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { alerts, clearAlerts, dismissAlert };
}

// Hook for XP notifications
export function useXPNotifications() {
  const [xpEvents, setXPEvents] = useState<XPEarned[]>([]);
  const [levelUpEvents, setLevelUpEvents] = useState<LevelUp[]>([]);

  useEffect(() => {
    const unsubXP = wsClient.on(WS_MESSAGE_TYPES.XP_EARNED, (msg) => {
      const event: XPEarned = {
        userId: msg.userId,
        vaultId: msg.vaultId,
        xpAmount: msg.xpAmount,
        totalXp: msg.totalXp,
        message: msg.message,
      };
      setXPEvents((prev) => [...prev, event]);
    });

    const unsubLevel = wsClient.on(WS_MESSAGE_TYPES.LEVEL_UP, (msg) => {
      const event: LevelUp = {
        userId: msg.userId,
        oldLevel: msg.oldLevel,
        newLevel: msg.newLevel,
        message: msg.message,
      };
      setLevelUpEvents((prev) => [...prev, event]);
    });

    return () => {
      unsubXP();
      unsubLevel();
    };
  }, []);

  const clearXPEvents = useCallback(() => {
    setXPEvents([]);
  }, []);

  const clearLevelUpEvents = useCallback(() => {
    setLevelUpEvents([]);
  }, []);

  return {
    xpEvents,
    levelUpEvents,
    clearXPEvents,
    clearLevelUpEvents,
  };
}

// Hook for real-time vault data (combines API fetch with WebSocket updates)
export function useRealtimeVault(vaultId: string | undefined) {
  const [pnl, setPnL] = useState<number | null>(null);
  const [drawdown, setDrawdown] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const update = useVaultPnLUpdates(vaultId, (data) => {
    setPnL(data.currentPnL);
    setDrawdown(data.drawdown);
    setLastUpdated(new Date(data.timestamp));
  });

  return {
    pnl: update?.currentPnL ?? pnl,
    currentValue: update?.currentValue ?? null,
    drawdown: update?.drawdown ?? drawdown,
    lastUpdated: update?.timestamp ? new Date(update.timestamp) : lastUpdated,
  };
}
