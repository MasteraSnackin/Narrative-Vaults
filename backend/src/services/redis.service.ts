import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function setupRedis() {
  if (redisClient) {
    console.log('Redis client already initialized.');
    return;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Connected to Redis'));

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis', err);
    process.exit(1); // Exit if Redis connection fails
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis() first.');
  }
  return redisClient;
}

export async function setCache(key: string, value: string, ttlSeconds: number = 3600) {
  const client = getRedisClient();
  await client.set(key, value, { EX: ttlSeconds });
}

export async function getCache(key: string): Promise<string | null> {
  const client = getRedisClient();
  return client.get(key);
}

export async function deleteCache(key: string) {
  const client = getRedisClient();
  await client.del(key);
}
