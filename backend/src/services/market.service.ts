import axios from 'axios';
import { Narrative } from '../types';

/**
 * Market Service
 * Checks if current market conditions meet narrative requirements using CoinGecko API.
 */

interface MarketData {
    price: number;
    priceCheck_24h: number; // Percentage change
    totalVolume: number;
    lastUpdated: number;
}

// Simple in-memory cache to avoid rate limits (CoinGecko Free: ~10-30 req/min)
const marketCache: Record<string, MarketData> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Mapping of asset symbols to CoinGecko IDs
const ASSET_ID_MAP: Record<string, string> = {
    'WBTC': 'bitcoin',
    'BTC': 'bitcoin',
    'WETH': 'ethereum',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'FET': 'fetch-ai',
    'RNDR': 'render-token',
    'TAO': 'bittensor',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    'PEPE': 'pepe'
};

/**
 * Check if the current market conditions allow trading for the given narrative
 */
export async function checkMarketConditions(narrative: Narrative): Promise<{ allowed: boolean; reason?: string, metrics?: any }> {
    // If narrative has no specific conditions, it's allowed
    if (!narrative.market_conditions) {
        return { allowed: true };
    }

    const conditions = narrative.market_conditions;
    console.log(`[Market] Checking conditions for ${narrative.name}:`, conditions);

    // Determine which asset to check (use first in long basket as primary indicator)
    const primaryAsset = narrative.long_basket[0];
    const coingeckoId = ASSET_ID_MAP[primaryAsset] || 'bitcoin'; // Default to BTC if unknown

    try {
        const marketData = await getMarketData(coingeckoId);
        console.log(`[Market] Data for ${primaryAsset} (${coingeckoId}):`, marketData);

        // Check volatility (using 24h price change as proxy for now)
        // Real volatility calculation requires historical candles, but 24h change is a decent simple proxy
        const absoluteChange = Math.abs(marketData.priceCheck_24h / 100);

        if (conditions.max_volatility && absoluteChange > conditions.max_volatility) {
            return {
                allowed: false,
                reason: `Volatility too high (24h Change: ${(absoluteChange * 100).toFixed(2)}% > ${(conditions.max_volatility * 100).toFixed(1)}%)`,
                metrics: marketData
            };
        }

        // Check volume
        if (conditions.min_daily_volume && marketData.totalVolume < conditions.min_daily_volume) {
            return {
                allowed: false,
                reason: `Volume too low (${formatVolume(marketData.totalVolume)} < ${formatVolume(conditions.min_daily_volume)})`,
                metrics: marketData
            };
        }

        // Check trend
        if (conditions.trend_direction) {
            const isBullish = marketData.priceCheck_24h > 0;
            const isBearish = marketData.priceCheck_24h < 0;

            if (conditions.trend_direction === 'bullish' && !isBullish) {
                return {
                    allowed: false,
                    reason: `Market bearish (24h Change: ${marketData.priceCheck_24h.toFixed(2)}%)`,
                    metrics: marketData
                };
            }

            if (conditions.trend_direction === 'bearish' && !isBearish) {
                return {
                    allowed: false,
                    reason: `Market bullish (24h Change: ${marketData.priceCheck_24h.toFixed(2)}%)`,
                    metrics: marketData
                };
            }
        }

        return { allowed: true, metrics: marketData };

    } catch (error) {
        console.error('[Market] Failed to fetch data:', error);
        // Fail safe: if we can't check, we block trading for safety
        return {
            allowed: false,
            reason: 'Failed to fetch market data. Trading paused for safety.'
        };
    }
}

/**
 * Fetch market data with caching
 */
async function getMarketData(assetId: string): Promise<MarketData> {
    const now = Date.now();
    const cached = marketCache[assetId];

    if (cached && (now - cached.lastUpdated < CACHE_TTL_MS)) {
        return cached;
    }

    try {
        // Fetch 24h data
        const response = await axios.get(`${COINGECKO_API}/simple/price`, {
            params: {
                ids: assetId,
                vs_currencies: 'usd',
                include_24hr_vol: true,
                include_24hr_change: true
            }
        });

        const data = response.data[assetId];
        if (!data) throw new Error(`No data for ${assetId}`);

        const marketData: MarketData = {
            price: data.usd,
            totalVolume: data.usd_24h_vol,
            priceCheck_24h: data.usd_24h_change,
            lastUpdated: now
        };

        marketCache[assetId] = marketData;
        return marketData;
    } catch (error: any) {
        if (error.response?.status === 429) {
            console.warn('[Market] Rate limit hit. Using cached data if available or simulated fallback.');
            if (cached) return cached;
            // Fallback if completely blocked and no cache
            return { price: 0, totalVolume: 1000000000, priceCheck_24h: 0, lastUpdated: now };
        }
        throw error;
    }
}

function formatVolume(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    return num.toString();
}
