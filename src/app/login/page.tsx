"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

// Client-side WebCrypto Proof-of-Work solver (~30ms in real browsers, impossible for raw bots)
async function solveShieldPoW(salt: string, difficulty: number): Promise<string> {
  const prefix = "0".repeat(difficulty);
  let nonce = 0;
  while (nonce < 100000) {
    const text = `${salt}:${nonce}`;
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    if (hashHex.startsWith(prefix)) {
      return nonce.toString();
    }
    nonce++;
  }
  return nonce.toString();
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const [isLogin, setIsLogin] = useState(true);
  const [useEmailOtpMode, setUseEmailOtpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [hpWebsite, setHpWebsite] = useState(""); // Honeypot trap
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // TOTP 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Turnstile bot shield
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  const handleBackToLogin = async () => {
    setError("");
    setSuccessMsg("");
    setTotpCode("");
    setRequires2FA(false);
    if (session) {
      await signOut({ redirect: false });
    }
  };

  // Handle active session needing 2FA (e.g. Google OAuth login on 2FA-enabled account)
  useEffect(() => {
    if (session?.user) {
      if ((session.user as any).needs2FA) {
        setRequires2FA(true);
        if (session.user.email) setEmail(session.user.email);
      } else if (!requires2FA) {
        router.push("/");
      }
    }
  }, [session, router, requires2FA]);

  // Fetch runtime challenge and Turnstile key
  useEffect(() => {
    fetch("/api/auth/shield")
      .then((res) => res.json())
      .then((data) => {
        if (data.turnstileSiteKey) {
          setTurnstileSiteKey(data.turnstileSiteKey);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Cloudflare Turnstile if site key is configured
  useEffect(() => {
    if (!isLogin && turnstileSiteKey && typeof window !== "undefined") {
      const renderWidget = () => {
        if ((window as any).turnstile && turnstileContainerRef.current) {
          turnstileContainerRef.current.innerHTML = "";
          (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: turnstileSiteKey,
            theme: "dark",
            callback: (token: string) => setTurnstileToken(token),
          });
        }
      };

      if ((window as any).turnstile) {
        renderWidget();
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 300);
        return () => clearInterval(interval);
      }
    }
  }, [isLogin, turnstileSiteKey]);

  // Handle requesting Email OTP code
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address first.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setSendingOtp(true);

    try {
      const res = await fetch("/api/auth/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: isLogin ? "login" : "signup" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP to email.");
      } else {
        setOtpSent(true);
        setSuccessMsg("6-Digit verification code sent! Check your inbox.");
      }
    } catch {
      setError("Failed to send OTP email. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      // 1. Session-based 2FA Verification (for Google OAuth & active sessions requiring 2FA)
      if (requires2FA && session?.user) {
        const res = await fetch("/api/auth/2fa/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totpCode }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid 2FA Code");
          setIsSubmitting(false);
          return;
        }

        await updateSession({ verified2FA: true });
        window.location.href = "/";
        return;
      }

      if (useEmailOtpMode) {
        // Sign in via Email OTP
        if (!emailOtp || emailOtp.length !== 6) {
          setError("Please enter the 6-digit OTP code sent to your email.");
          setIsSubmitting(false);
          return;
        }

        const res = await signIn("credentials", {
          redirect: false,
          email,
          emailOtp,
        });

        if (res?.error) {
          setError(res.error);
        } else {
          window.location.href = "/";
          return;
        }
      } else if (isLogin) {
        // Sign in via Password (with optional TOTP 2FA)
        const credentialsPayload: Record<string, string> = {
          email,
          password,
        };
        if (requires2FA && totpCode && totpCode.length === 6) {
          credentialsPayload.totpCode = totpCode;
        }

        const res = await signIn("credentials", {
          redirect: false,
          ...credentialsPayload,
        });

        if (res?.error) {
          if (res.error === "2FA_REQUIRED") {
            setRequires2FA(true);
            setError("");
          } else {
            setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
          }
        } else {
          window.location.href = "/";
          return;
        }
      } else {
        // Sign Up / Register: Require Email OTP Verification
        if (!otpSent || emailOtp.length !== 6) {
          setError("Please verify your email with the 6-digit code first.");
          setIsSubmitting(false);
          return;
        }

        // Solve browser anti-bot challenge
        let shieldPayload = null;
        try {
          const challengeRes = await fetch("/api/auth/shield");
          if (challengeRes.ok) {
            const challenge = await challengeRes.json();
            const solution = await solveShieldPoW(challenge.salt, challenge.targetDifficulty);
            shieldPayload = { ...challenge, solution };
          }
        } catch (shieldErr) {
          console.warn("Shield solver warning:", shieldErr);
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            emailOtp,
            hp_website: hpWebsite,
            shield: shieldPayload,
            turnstileToken,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Registration failed");
          setIsSubmitting(false);
          return;
        }

        // Auto sign in after verified registration
        const autoLogin = await signIn("credentials", { redirect: false, email, password });
        if (autoLogin?.ok) {
          window.location.href = "/";
        } else {
          setIsLogin(true);
          setSuccessMsg("Account created successfully! Please sign in.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Kanban Cloud
          </h1>
          <p className="text-slate-400 mt-2">
            {requires2FA
              ? "Two-Factor Verification Required"
              : isLogin
              ? useEmailOtpMode
                ? "Sign in with Email OTP Code"
                : "Welcome back to your workspace"
              : "Create verified private workspace"}
          </p>
        </div>

        {!requires2FA && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0f172a] text-slate-400">Or continue with email</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm text-center font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {requires2FA ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <div className="text-emerald-400 font-semibold flex items-center justify-center gap-2 mb-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Two-Factor Authentication
                </div>
                <p className="text-slate-300 text-xs">
                  Enter the 6-digit code from Google or Microsoft Authenticator for <span className="text-white font-medium">{email || session?.user?.email}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.5em] text-3xl font-mono px-4 py-3 bg-slate-900/80 border border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-emerald-400 placeholder:tracking-normal placeholder:text-sm"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/25"
              >
                {isSubmitting ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors pt-2"
              >
                ← Back to Login
              </button>
            </div>
          ) : useEmailOtpMode ? (
            /* Email OTP Login Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-200 text-sm"
                    placeholder="you@example.com"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={sendingOtp || !email}
                    className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
                  >
                    {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 text-center">
                    Enter 6-Digit Verification Code sent to email:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.5em] text-3xl font-mono px-4 py-3 bg-slate-900/80 border border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-emerald-400 placeholder:tracking-normal placeholder:text-sm"
                    placeholder="000000"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !otpSent || emailOtp.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/25"
              >
                {isSubmitting ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setUseEmailOtpMode(false); setError(""); setSuccessMsg(""); }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1"
              >
                ← Switch back to Password Login
              </button>
            </div>
          ) : (
            /* Standard Password Login / Verified Sign-Up Mode */
            <>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                {!isLogin ? (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200 text-sm"
                      placeholder="you@example.com"
                    />
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={sendingOtp || !email}
                      className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shrink-0"
                    >
                      {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                ) : (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200"
                    placeholder="you@example.com"
                  />
                )}
              </div>

              {!isLogin && otpSent && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 text-center">
                    Enter 6-Digit Email Verification Code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.5em] text-3xl font-mono px-4 py-2.5 bg-slate-900/80 border border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-emerald-400 placeholder:tracking-normal placeholder:text-sm"
                    placeholder="000000"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-200"
                  placeholder="••••••••"
                />
              </div>

              {/* Invisible honeypot trap for bots */}
              <input
                type="text"
                name="hp_website"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ display: "none", position: "absolute", left: "-9999px" }}
              />

              {!isLogin && turnstileSiteKey && (
                <div ref={turnstileContainerRef} className="my-3 flex justify-center min-h-[65px]" />
              )}

              <button
                type="submit"
                disabled={isSubmitting || (!isLogin && (!otpSent || emailOtp.length !== 6))}
                className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
              >
                {isSubmitting
                  ? "Verifying..."
                  : isLogin
                  ? "Sign In"
                  : !otpSent
                  ? "Click 'Send OTP' above to verify"
                  : "Verify OTP & Create Account"}
              </button>

              {isLogin && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setUseEmailOtpMode(true); setError(""); setSuccessMsg(""); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    ✉️ Sign in with Email OTP Code instead
                  </button>
                </div>
              )}
            </>
          )}
        </form>

        {!requires2FA && turnstileSiteKey && (
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
        )}

        {!requires2FA && (
          <p className="mt-6 text-center text-slate-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setUseEmailOtpMode(false);
                setOtpSent(false);
                setEmailOtp("");
                setError("");
                setSuccessMsg("");
              }}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
