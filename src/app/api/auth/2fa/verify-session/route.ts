import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyTOTP } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { totpCode } = await req.json();
    if (!totpCode || totpCode.trim().length !== 6) {
      return NextResponse.json({ error: "Valid 6-digit code is required" }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id, 10);
    const db = getDb();
    const res = await db.query(
      "SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1",
      [userId]
    );
    const user = res.rows[0];

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return NextResponse.json({ success: true, message: "2FA not required" });
    }

    const isValid = verifyTOTP(user.two_factor_secret, totpCode.trim());
    if (!isValid) {
      return NextResponse.json({ error: "Invalid 6-digit code. Please check your Authenticator app." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "2FA verified successfully" });
  } catch (err) {
    console.error("2FA Session Verify Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
