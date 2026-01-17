import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../app/globals.css';
import { Web3Provider } from '../providers/Web3Provider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3Provider>
      <Head>
        <title>Narrative Vaults</title>
        <meta name="description" content="Gamified pair trading platform" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </Web3Provider>
  );
}

export default MyApp;
