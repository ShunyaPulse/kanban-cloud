import { getCache } from "./cache";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Distributed Redis Rate Limiter (Token bucket / Fixed window counter)
 * @param key Unique key (e.g. rate:register:1.2.3.4 or rate:login:email@domain.com)
 * @param limit Maximum allowed attempts within the time window
 * @param windowInSeconds Expiration window in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowInSeconds: number
): Promise<RateLimitResult> {
  const { redis, cacheEnabled } = getCache();
  if (!cacheEnabled || !redis) {
    // If Redis is offline, fail open to avoid service outage
    return { success: true, remaining: limit, resetInSeconds: 0 };
  }

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowInSeconds);
    }
    const ttl = await redis.ttl(key);
    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds: Math.max(0, ttl),
    };
  } catch (err) {
    console.warn("Rate limit check error, allowing request:", err);
    return { success: true, remaining: limit, resetInSeconds: 0 };
  }
}

/**
 * Helper to safely extract client IP behind Cloud Run / Google Frontend proxy
 */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  if (headers && typeof (headers as Headers).get === "function") {
    const reqHeaders = headers as Headers;
    const cfIp = reqHeaders.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
    const forwarded = reqHeaders.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
    const realIp = reqHeaders.get("x-real-ip");
    if (realIp) return realIp.trim();
  } else if (headers) {
    const raw = headers as Record<string, string | string[] | undefined>;
    const cfIp = raw["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();
    const forwarded = raw["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      const last = forwarded[forwarded.length - 1];
      if (last) return last.trim();
    }
    const realIp = raw["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  }
  return "unknown-ip";
}

/**
 * Extracts the Subnet / Prefix of the IP
 * IPv6: /48 prefix (first 3 segments) e.g., 2402:3a80:159::
 * IPv4: /24 subnet (first 3 octets) e.g., 112.79.12.0
 * Kills mobile flight-mode dynamic IP rotation!
 */
export function getClientSubnet(ip: string): string {
  if (!ip || ip === "unknown-ip" || ip === "127.0.0.1") return ip;

  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::/48";
  } else if (ip.includes(".")) {
    const parts = ip.split(".");
    return parts.slice(0, 3).join(".") + ".0/24";
  }
  return ip;
}

