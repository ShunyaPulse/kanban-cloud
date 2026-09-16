import Redis from "ioredis";

let redis: Redis | null = null;
let cacheEnabled = false;

export function getCache() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "", {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn("Redis connection failed. Degrading to DB only.");
          cacheEnabled = false;
          return null; 
        }
        return Math.min(times * 100, 3000);
      },
    });

    redis.on('connect', () => {
      console.log('Redis cache connected successfully');
      cacheEnabled = true;
    });

    redis.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      cacheEnabled = false;
    });
  }
  return { redis, cacheEnabled };
}
