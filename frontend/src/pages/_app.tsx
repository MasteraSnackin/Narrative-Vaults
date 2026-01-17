import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../app/globals.css';
import { Web3Provider } from '../providers/Web3Provider';
import { PearHyperliquidProvider } from '@pear-protocol/hyperliquid-sdk';

const PEAR_API_URL = process.env.NEXT_PUBLIC_PEAR_API_URL || 'https://hl-ui.pearprotocol.io';
const PEAR_WS_URL = process.env.NEXT_PUBLIC_PEAR_WS_URL || 'wss://hl-ui.pearprotocol.io/ws';
const PEAR_CLIENT_ID = process.env.NEXT_PUBLIC_PEAR_CLIENT_ID || 'NarrativeVaults';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3Provider>
      <PearHyperliquidProvider
        apiBaseUrl={PEAR_API_URL}
        wsUrl={PEAR_WS_URL}
        clientId={PEAR_CLIENT_ID}
      >
        <Head>
          <title>Narrative Vaults</title>
          <meta name="description" content="Gamified pair trading platform" />
          <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        </Head>
        <Component {...pageProps} />
      </PearHyperliquidProvider>
    </Web3Provider>
  );
}

export default MyApp;
