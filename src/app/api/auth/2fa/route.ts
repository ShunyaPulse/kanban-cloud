import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";
import { generateBase32Secret, getTOTPAuthUri, verifyTOTP } from "@/lib/totp";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id, 10);
    await initDb();
    const db = getDb();

    const res = await db.query(
      "SELECT two_factor_enabled, email FROM users WHERE id = $1",
      [userId]
    );
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.two_factor_enabled) {
      return NextResponse.json({ enabled: true });
    }

    // Generate new secret & QR code for setup
    const secret = generateBase32Secret(20);
    const uri = getTOTPAuthUri(user.email, secret, "Kanban Cloud");
    const qrCodeUrl = await QRCode.toDataURL(uri, {
      margin: 1,
      width: 200,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      enabled: false,
      secret,
      uri,
      qrCodeUrl,
    });
  } catch (err) {
    console.error("2FA GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id, 10);
    const { secret, totpCode } = await req.json();

    if (!secret || !totpCode || totpCode.length !== 6) {
      return NextResponse.json({ error: "Valid 6-digit code and secret are required" }, { status: 400 });
    }

    const isValid = verifyTOTP(secret, totpCode);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code. Please check your app and try again." }, { status: 400 });
    }

    await initDb();
    const db = getDb();
    await db.query(
      "UPDATE users SET two_factor_secret = $1, two_factor_enabled = TRUE WHERE id = $2",
      [secret, userId]
    );

    return NextResponse.json({ success: true, message: "Two-Factor Authentication enabled successfully" });
  } catch (err) {
    console.error("2FA POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id, 10);
    const { totpCode } = await req.json();

    await initDb();
    const db = getDb();
    const res = await db.query(
      "SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1",
      [userId]
    );
    const user = res.rows[0];

    if (!user || !user.two_factor_enabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    const isValid = verifyTOTP(user.two_factor_secret, totpCode);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
    }

    await db.query(
      "UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = $1",
      [userId]
    );

    return NextResponse.json({ success: true, message: "Two-Factor Authentication disabled" });
  } catch (err) {
    console.error("2FA DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
