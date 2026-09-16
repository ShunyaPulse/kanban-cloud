import Redis from "ioredis";

let redis: Redis | null = null;
let cacheEnabled = Boolean(process.env.REDIS_URL);

export function getCache() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn("Redis connection failed. Degrading to DB only.");
          cacheEnabled = false;
          return null; 
        }
        return Math.min(times * 100, 2000);
      },
    });

    redis.on('connect', () => {
      console.log('Redis cache connected successfully');
      cacheEnabled = true;
    });

    redis.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      if (redis?.status === 'end') {
        cacheEnabled = false;
      }
    });
  }
  return { redis, cacheEnabled };
}
