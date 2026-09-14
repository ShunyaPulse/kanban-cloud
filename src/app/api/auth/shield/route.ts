import { NextResponse } from "next/server";
import { generateShieldChallenge } from "@/lib/bot-shield";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const challenge = generateShieldChallenge();
  const turnstileSiteKey = process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  const res = NextResponse.json({ ...challenge, turnstileSiteKey });

  // Set device fingerprint cookie if not present
  const cookiesHeader = req.headers.get("cookie") || "";
  if (!cookiesHeader.includes("__kc_dev_id")) {
    const deviceId = uuidv4();
    res.cookies.set("__kc_dev_id", deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return res;
}
