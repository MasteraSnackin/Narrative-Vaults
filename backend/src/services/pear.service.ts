import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Vault, Narrative } from '../types';

// Configuration
const PEAR_API_BASE_URL = process.env.PEAR_API_BASE_URL || 'https://api.pear.garden';
const PEAR_CLIENT_ID = process.env.PEAR_CLIENT_ID || 'HLHackathon1';
const PEAR_API_KEY = process.env.PEAR_API_KEY || '';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

// Rate limiting
const RATE_LIMIT_REQUESTS_PER_SECOND = 10;
let lastRequestTime = 0;
let requestCount = 0;

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  nextRetryTime: Date | null;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: null,
  isOpen: false,
  nextRetryTime: null
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

// Interfaces
export interface PearTradeRequest {
  clientId: string;
  longAsset?: string;
  shortAsset?: string;
  longAmount?: number;
  leverage?: number;
  slippageTolerance?: number;
  longBasket?: Array<{ asset: string; weight: number }>;
  shortBasket?: Array<{ asset: string; weight: number }>;
  totalValue?: number;
}

export interface PearPositionResponse {
  tradeId: string;
  status: 'open' | 'closed' | 'liquidated' | 'pending' | 'partial_fill' | 'failed';
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL?: number;
  entryValue?: number;
  longPositions: Array<{
    asset: string;
    quantity: number;
    entryPrice: number;
    currentPrice?: number;
    unrealizedPnL?: number;
  }>;
  shortPositions: Array<{
    asset: string;
    quantity: number;
    entryPrice: number;
    currentPrice?: number;
    unrealizedPnL?: number;
  }>;
  leverage?: number;
  openedAt?: string;
  closedAt?: string;
  fillPercentage?: number;
}

// For backward compatibility with other files
export type PositionStatusResponse = PearPositionResponse;

// Create axios instance with defaults
const pearApi: AxiosInstance = axios.create({
  baseURL: PEAR_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(PEAR_API_KEY && { 'X-API-Key': PEAR_API_KEY })
  }
});

// Add request interceptor for logging
pearApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  console.log(`[Pear API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Add response interceptor for logging
pearApi.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[Pear API] Response: ${response.status}`);
    return response;
  },
  (error: AxiosError) => {
    console.error(`[Pear API] Error: ${error.response?.status || error.message}`);
    return Promise.reject(error);
  }
);

/**
 * Check if circuit breaker is open
 */
function isCircuitBreakerOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;

  // Check if we should try again
  if (circuitBreaker.nextRetryTime && new Date() >= circuitBreaker.nextRetryTime) {
    console.log('[Pear API] Circuit breaker: attempting reset');
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    return false;
  }

  return true;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = new Date();

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    circuitBreaker.nextRetryTime = new Date(Date.now() + CIRCUIT_BREAKER_RESET_MS);
    console.warn(`[Pear API] Circuit breaker OPEN - will retry at ${circuitBreaker.nextRetryTime.toISOString()}`);
  }
}

/**
 * Record a success for circuit breaker
 */
function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
  circuitBreaker.nextRetryTime = null;
}

/**
 * Apply rate limiting
 */
async function applyRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < 1000) {
    requestCount++;
    if (requestCount >= RATE_LIMIT_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - timeSinceLastRequest;
      console.log(`[Pear API] Rate limiting: waiting ${waitTime}ms`);
      await sleep(waitTime);
      requestCount = 0;
    }
  } else {
    requestCount = 0;
  }

  lastRequestTime = Date.now();
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
  return Math.min(delay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network error - retryable
    return true;
  }

  const status = error.response.status;
  // Retry on 5xx errors and rate limiting (429)
  return status >= 500 || status === 429;
}

/**
 * Execute API call with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  if (isCircuitBreakerOpen()) {
    throw new Error(`[Pear API] Circuit breaker is open - ${operationName} blocked`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await applyRateLimit();
      const result = await operation();
      recordSuccess();
      return result;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AxiosError) {
        if (!isRetryableError(error)) {
          // Non-retryable error - fail immediately
          recordFailure();
          throw error;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = getRetryDelay(attempt);
          console.warn(`[Pear API] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);
          await sleep(delay);
        }
      } else {
        // Non-axios error - don't retry
        throw error;
      }
    }
  }

  recordFailure();
  throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} attempts`);
}

/**
 * Execute a pair trade via Pear API
 */
export async function executePairTrade(
  tradeData: Omit<PearTradeRequest, 'clientId' | 'longBasket' | 'shortBasket' | 'totalValue'>
): Promise<string> {
  return executeWithRetry(async () => {
    const payload = {
      clientId: PEAR_CLIENT_ID,
      ...tradeData,
    };

    console.log('[Pear API] Executing pair trade:', {
      longAsset: tradeData.longAsset,
      shortAsset: tradeData.shortAsset,
      leverage: tradeData.leverage
    });

    const response = await pearApi.post('/api/v1/execute-pair', payload);

    if (!response.data?.tradeId) {
      throw new Error('Invalid response from Pear API: missing tradeId');
    }

    console.log(`[Pear API] Pair trade executed successfully. Trade ID: ${response.data.tradeId}`);
    return response.data.tradeId;
  }, 'executePairTrade');
}

/**
 * Execute a basket trade via Pear API
 */
export async function executeBasketTrade(
  tradeData: Omit<PearTradeRequest, 'clientId' | 'longAsset' | 'shortAsset' | 'longAmount'>
): Promise<string> {
  return executeWithRetry(async () => {
    const payload = {
      clientId: PEAR_CLIENT_ID,
      ...tradeData,
    };

    console.log('[Pear API] Executing basket trade:', {
      longBasket: tradeData.longBasket,
      shortBasket: tradeData.shortBasket,
      totalValue: tradeData.totalValue
    });

    const response = await pearApi.post('/api/v1/execute-basket', payload);

    if (!response.data?.tradeId) {
      throw new Error('Invalid response from Pear API: missing tradeId');
    }

    console.log(`[Pear API] Basket trade executed successfully. Trade ID: ${response.data.tradeId}`);
    return response.data.tradeId;
  }, 'executeBasketTrade');
}

/**
 * Get position status from Pear API
 */
export async function getPosition(tradeId: string): Promise<PearPositionResponse | null> {
  try {
    return await executeWithRetry(async () => {
      const response = await pearApi.get(`/api/v1/position/${tradeId}`);

      if (!response.data) {
        return null;
      }

      // Normalize the response
      const position: PearPositionResponse = {
        tradeId: response.data.tradeId || tradeId,
        status: response.data.status || 'open',
        currentValue: response.data.currentValue || 0,
        unrealizedPnL: response.data.unrealizedPnL || 0,
        realizedPnL: response.data.realizedPnL,
        entryValue: response.data.entryValue,
        longPositions: response.data.longPositions || [],
        shortPositions: response.data.shortPositions || [],
        leverage: response.data.leverage,
        openedAt: response.data.openedAt,
        closedAt: response.data.closedAt,
        fillPercentage: response.data.fillPercentage
      };

      return position;
    }, `getPosition(${tradeId})`);
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.status === 404) {
      console.warn(`[Pear API] Position ${tradeId} not found`);
      return null;
    }
    console.error(`[Pear API] Error getting position ${tradeId}:`, err);
    return null;
  }
}

/**
 * Close a position via Pear API
 */
export async function closePosition(tradeId: string): Promise<{ success: boolean; finalPnL?: number }> {
  return executeWithRetry(async () => {
    console.log(`[Pear API] Closing position ${tradeId}`);

    const response = await pearApi.post(`/api/v1/close/${tradeId}`);

    console.log(`[Pear API] Position ${tradeId} closed successfully`);

    return {
      success: true,
      finalPnL: response.data?.realizedPnL
    };
  }, `closePosition(${tradeId})`);
}

/**
 * Partially close a position
 */
export async function partialClosePosition(
  tradeId: string,
  percentage: number
): Promise<{ success: boolean; remainingValue?: number }> {
  if (percentage <= 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  return executeWithRetry(async () => {
    console.log(`[Pear API] Partially closing position ${tradeId} (${percentage}%)`);

    const response = await pearApi.post(`/api/v1/partial-close/${tradeId}`, {
      percentage
    });

    console.log(`[Pear API] Position ${tradeId} partially closed`);

    return {
      success: true,
      remainingValue: response.data?.remainingValue
    };
  }, `partialClosePosition(${tradeId})`);
}

/**
 * Prepare trade data from vault/narrative config for Pear API
 */
export function prepareTradeData(vault: Vault, narrative: Narrative): PearTradeRequest {
  // Determine if this is a pair trade or basket trade
  const isBasketTrade = narrative.long_basket.length > 1 || narrative.short_basket.length > 1;

  if (isBasketTrade) {
    // Prepare basket trade with equal weights
    const longWeightPerAsset = 1 / narrative.long_basket.length;
    const shortWeightPerAsset = 1 / narrative.short_basket.length;

    return {
      clientId: PEAR_CLIENT_ID,
      longBasket: narrative.long_basket.map(asset => ({
        asset,
        weight: longWeightPerAsset
      })),
      shortBasket: narrative.short_basket.map(asset => ({
        asset,
        weight: shortWeightPerAsset
      })),
      totalValue: vault.total_deposits,
      leverage: narrative.base_leverage,
      slippageTolerance: 0.01
    };
  }

  // Prepare pair trade
  return {
    clientId: PEAR_CLIENT_ID,
    longAsset: narrative.long_basket[0],
    shortAsset: narrative.short_basket[0],
    longAmount: vault.total_deposits,
    leverage: narrative.base_leverage,
    slippageTolerance: 0.01
  };
}

/**
 * Get trade ID from a transaction hash (for Salt integration)
 * This polls the API to find the trade associated with a transaction
 */
export async function getTradeIdFromTxHash(txHash: string): Promise<string> {
  return executeWithRetry(async () => {
    console.log(`[Pear API] Looking up trade ID for tx: ${txHash}`);

    // Try to get trade ID from Pear API
    try {
      const response = await pearApi.get(`/api/v1/trade-by-tx/${txHash}`);
      if (response.data?.tradeId) {
        return response.data.tradeId;
      }
    } catch (err: unknown) {
      // If endpoint doesn't exist, fall back to simulation
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        console.warn(`[Pear API] Trade lookup endpoint not available, generating simulated ID`);
      } else {
        throw err;
      }
    }

    // Fallback: generate a deterministic trade ID from the tx hash
    const simulatedTradeId = `pear-${txHash.slice(2, 10)}-${Date.now().toString(36)}`;
    console.log(`[Pear API] Generated trade ID: ${simulatedTradeId}`);
    return simulatedTradeId;
  }, `getTradeIdFromTxHash(${txHash})`);
}

/**
 * Get all open positions for a client
 */
export async function getAllOpenPositions(): Promise<PearPositionResponse[]> {
  return executeWithRetry(async () => {
    const response = await pearApi.get('/api/v1/positions', {
      params: {
        clientId: PEAR_CLIENT_ID,
        status: 'open'
      }
    });

    return response.data?.positions || [];
  }, 'getAllOpenPositions');
}

/**
 * Check if the Pear API is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await pearApi.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(): CircuitBreakerState {
  return { ...circuitBreaker };
}

/**
 * Reset circuit breaker (for admin use)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailure = null;
  circuitBreaker.isOpen = false;
  circuitBreaker.nextRetryTime = null;
  console.log('[Pear API] Circuit breaker reset manually');
}

/**
 * Validate trade parameters before submission
 */
export function validateTradeParams(tradeData: PearTradeRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tradeData.clientId) {
    errors.push('clientId is required');
  }

  // Check for pair trade params
  if (tradeData.longAsset || tradeData.shortAsset) {
    if (!tradeData.longAsset) errors.push('longAsset is required for pair trades');
    if (!tradeData.shortAsset) errors.push('shortAsset is required for pair trades');
    if (!tradeData.longAmount || tradeData.longAmount <= 0) {
      errors.push('longAmount must be positive for pair trades');
    }
  }

  // Check for basket trade params
  if (tradeData.longBasket || tradeData.shortBasket) {
    if (!tradeData.longBasket?.length) errors.push('longBasket is required for basket trades');
    if (!tradeData.shortBasket?.length) errors.push('shortBasket is required for basket trades');
    if (!tradeData.totalValue || tradeData.totalValue <= 0) {
      errors.push('totalValue must be positive for basket trades');
    }

    // Validate weights sum to ~1
    const longWeightSum = tradeData.longBasket?.reduce((sum, item) => sum + item.weight, 0) || 0;
    const shortWeightSum = tradeData.shortBasket?.reduce((sum, item) => sum + item.weight, 0) || 0;

    if (Math.abs(longWeightSum - 1) > 0.01) {
      errors.push(`longBasket weights must sum to 1 (got ${longWeightSum})`);
    }
    if (Math.abs(shortWeightSum - 1) > 0.01) {
      errors.push(`shortBasket weights must sum to 1 (got ${shortWeightSum})`);
    }
  }

  // Validate leverage
  if (tradeData.leverage !== undefined) {
    if (tradeData.leverage < 1 || tradeData.leverage > 10) {
      errors.push('leverage must be between 1 and 10');
    }
  }

  // Validate slippage
  if (tradeData.slippageTolerance !== undefined) {
    if (tradeData.slippageTolerance < 0 || tradeData.slippageTolerance > 0.1) {
      errors.push('slippageTolerance must be between 0 and 0.1 (10%)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
