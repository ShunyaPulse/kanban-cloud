import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "kanban-cloud-shield-default-key-2026";

export interface ShieldChallenge {
  salt: string;
  targetDifficulty: number; // e.g., 2 leading hex zeroes '00'
  timestamp: number;
  signature: string;
}

/**
 * Generate a cryptographically signed puzzle for the client browser
 */
export function generateShieldChallenge(): ShieldChallenge {
  const salt = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const targetDifficulty = 2; // Real browser solves in ~50ms

  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${salt}:${timestamp}:${targetDifficulty}`)
    .digest("hex");

  return {
    salt,
    targetDifficulty,
    timestamp,
    signature,
  };
}

/**
 * Verify that the puzzle solution provided by the client is mathematically valid
 * and solved within a reasonable timeframe (e.g. 5 minutes)
 */
export function verifyShieldSolution(
  salt: string,
  timestamp: number,
  targetDifficulty: number,
  signature: string,
  solution: string
): boolean {
  if (!salt || !timestamp || !signature || !solution) return false;

  // Expire challenges older than 10 minutes
  if (Date.now() - timestamp > 10 * 60 * 1000) return false;

  // Verify HMAC signature to prevent client tampering
  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(`${salt}:${timestamp}:${targetDifficulty}`)
    .digest("hex");

  if (expectedSig !== signature) return false;

  // Verify proof-of-work solution
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${solution}`)
    .digest("hex");

  // Clamp difficulty to a safe maximum to prevent resource exhaustion
  // from a user-controlled targetDifficulty value (CodeQL js/resource-exhaustion)
  const safeDifficulty = Math.min(Math.max(0, Math.floor(targetDifficulty)), 8);
  const prefix = "0".repeat(safeDifficulty);
  return hash.startsWith(prefix);
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
