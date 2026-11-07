import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "kanban-cloud-shield-default-key-2026";
const SHIELD_MAX_AGE_MS = 3 * 60 * 1000; // 3 minutes TTL

// In-memory replay prevention cache for consumed challenge salts
const consumedShieldSalts = new Map<string, number>();

// Periodic cleanup of expired salts every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [salt, expiresAt] of consumedShieldSalts.entries()) {
    if (expiresAt <= now) {
      consumedShieldSalts.delete(salt);
    }
  }
}, 5 * 60 * 1000).unref();

export interface ShieldChallenge {
  salt: string;
  targetDifficulty: number; // 4 leading hex zeroes '0000' (~65,536 hash computations)
  timestamp: number;
  signature: string;
}

/**
 * Generate a cryptographically signed puzzle for the client browser.
 * Hardened static difficulty (4 hex zeroes '0000', ~65,536 iterations).
 */
export function generateShieldChallenge(clientIp?: string): ShieldChallenge {
  const salt = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const targetDifficulty = 4; // Hardened static '0000' requirement

  const payload = clientIp
    ? `${salt}:${timestamp}:${targetDifficulty}:${clientIp}`
    : `${salt}:${timestamp}:${targetDifficulty}`;

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  return {
    salt,
    targetDifficulty,
    timestamp,
    signature,
  };
}

/**
 * Verify that the puzzle solution provided by the client is mathematically valid,
 * meets the hardened static difficulty, solved within 3 minutes, and has not been replayed.
 */
export function verifyShieldSolution(
  salt: string,
  timestamp: number,
  targetDifficulty: number,
  signature: string,
  solution: string,
  remoteIp?: string
): boolean {
  if (!salt || !timestamp || !signature || !solution) return false;

  // Enforce hardened static difficulty (minimum 4 = '0000')
  if (targetDifficulty < 4) return false;

  const now = Date.now();
  // Expire challenges older than 3 minutes or timestamps in the future
  if (now - timestamp > SHIELD_MAX_AGE_MS || timestamp > now + 60_000) return false;

  // Reject replayed challenges
  const existingExp = consumedShieldSalts.get(salt);
  if (existingExp && existingExp > now) return false;

  // Verify HMAC signature to prevent client tampering using constant-time comparison.
  // Checks both IP-bound signature and generic signature for reverse proxy compatibility.
  const expectedSigIp = crypto
    .createHmac("sha256", SECRET)
    .update(`${salt}:${timestamp}:${targetDifficulty}${remoteIp ? `:${remoteIp}` : ""}`)
    .digest("hex");

  const expectedSigGeneric = crypto
    .createHmac("sha256", SECRET)
    .update(`${salt}:${timestamp}:${targetDifficulty}`)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expIpBuffer = Buffer.from(expectedSigIp, "hex");
  const expGenBuffer = Buffer.from(expectedSigGeneric, "hex");

  const matchesIp =
    sigBuffer.length === expIpBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expIpBuffer);

  const matchesGen =
    sigBuffer.length === expGenBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expGenBuffer);

  if (!matchesIp && !matchesGen) return false;

  // Verify proof-of-work solution
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${solution}`)
    .digest("hex");

  // Verify proof-of-work solution without String.prototype.repeat to prevent CodeQL js/resource-exhaustion
  const PREFIX_TABLE: Record<number, string> = {
    1: "0",
    2: "00",
    3: "000",
    4: "0000",
    5: "00000",
    6: "000000",
    7: "0000000",
    8: "00000000",
  };

  const prefix = PREFIX_TABLE[targetDifficulty];
  if (!prefix || !hash.startsWith(prefix)) return false;

  // Mark salt as consumed for 3 minutes to eliminate replay attacks
  consumedShieldSalts.set(salt, now + SHIELD_MAX_AGE_MS);
  return true;
}

/**
 * Verify Cloudflare Turnstile token if configured
 */
export async function verifyCloudflareTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If not configured in Cloud Run env, pass through to let Bot-Shield handle it
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("Cloudflare Turnstile verification error:", err);
    return false;
  }
}
