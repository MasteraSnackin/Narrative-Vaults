import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { api, getAuthMessage } from '../utils/api';

interface WalletConnectButtonProps {
  onAuthChange?: (isAuthenticated: boolean, address?: string) => void;
}

const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ onAuthChange }) => {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isAuthenticating) {
      handleAuthenticate();
    }
    if (!isConnected) {
      setIsAuthenticated(false);
      api.clearAuth();
      onAuthChange?.(false);
    }
  }, [isConnected, address]);

  const handleAuthenticate = async () => {
    if (!address) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const timestamp = Date.now();
      const message = getAuthMessage(timestamp);

      // Sign the message
      const signature = await signMessageAsync({ message });

      // Set auth headers for API
      api.setAuth(address, signature, timestamp);

      // Verify with backend (this will create user if not exists)
      await api.getUser(address);

      setIsAuthenticated(true);
      onAuthChange?.(true, address);
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setError(err.message || 'Authentication failed');
      setIsAuthenticated(false);
      api.clearAuth();
      onAuthChange?.(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsAuthenticated(false);
    api.clearAuth();
    onAuthChange?.(false);
  };

  const handleConnect = () => {
    setError(null);
    connect({ connector: injected() });
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-300">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {isAuthenticated && (
            <span className="text-xs text-green-400">Authenticated</span>
          )}
          {isAuthenticating && (
            <span className="text-xs text-yellow-400">Signing...</span>
          )}
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>

        {!isAuthenticated && !isAuthenticating && (
          <button
            className="px-3 py-1.5 bg-blue-600 rounded-md hover:bg-blue-700 text-white text-sm font-semibold"
            onClick={handleAuthenticate}
          >
            Sign In
          </button>
        )}

        <button
          className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 text-white font-semibold"
          onClick={handleDisconnect}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
      <button
        className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 text-white font-semibold disabled:opacity-50"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
};

export default WalletConnectButton;
