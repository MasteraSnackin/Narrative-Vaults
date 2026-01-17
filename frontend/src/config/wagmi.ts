import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Define HyperEVM chain
const hyperEVM = {
  id: 998,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVM Explorer', url: 'https://explorer.hyperliquid.xyz' },
  },
} as const;

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [hyperEVM, mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'Narrative Vaults',
        description: 'Gamified pair trading platform',
        url: 'https://narrativevaults.xyz',
        icons: ['https://narrativevaults.xyz/icon.png'],
      },
    }),
  ],
  transports: {
    [hyperEVM.id]: http(),
    [mainnet.id]: http(),
  },
});

// Export chain for use elsewhere
export { hyperEVM };

// Auth message helper
export const AUTH_MESSAGE_PREFIX = 'Sign this message to authenticate with Narrative Vaults: ';

export function getAuthMessage(timestamp: number): string {
  return `${AUTH_MESSAGE_PREFIX}${timestamp}`;
}
