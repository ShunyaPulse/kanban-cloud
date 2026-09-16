"use client";

import { useState, useEffect } from "react";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TwoFactorModal({ isOpen, onClose }: TwoFactorModalProps) {
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"qr" | "key">("qr");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setCode("");
      setLoading(true);
      fetch("/api/auth/2fa")
        .then((res) => res.json())
        .then((data) => {
          if (data.enabled) {
            setIsEnabled(true);
          } else {
            setIsEnabled(false);
            setSecret(data.secret || "");
            setUri(data.uri || "");
            setQrCodeUrl(data.qrCodeUrl || "");
          }
        })
        .catch(() => setError("Failed to load 2FA settings"))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, totpCode: code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
      } else {
        setSuccess("Two-Factor Authentication enabled successfully!");
        setIsEnabled(true);
        setCode("");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpCode: code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to disable 2FA");
      } else {
        setSuccess("Two-Factor Authentication has been disabled");
        setIsEnabled(false);
        setCode("");
        // Reload settings to get a new secret
        const refreshRes = await fetch("/api/auth/2fa");
        const refreshData = await refreshRes.json();
        setSecret(refreshData.secret || "");
        setUri(refreshData.uri || "");
        setQrCodeUrl(refreshData.qrCodeUrl || "");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Two-Factor Security</h3>
              <p className="text-xs text-slate-400">Protect account with Authenticator app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium text-center">
            {success}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
            Loading security settings...
          </div>
        ) : isEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-center space-y-1">
              <div className="text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                2FA Active & Protected
              </div>
              <p className="text-xs text-slate-300">
                Your account is secured with Google or Microsoft Authenticator.
              </p>
            </div>

            <form onSubmit={handleDisable} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  To disable 2FA, enter your current 6-digit Authenticator code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-red-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full py-2.5 px-4 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors"
              >
                {submitting ? "Disabling..." : "Disable Two-Factor Authentication"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Setup Tabs: QR Code vs Manual Key */}
            <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "qr"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                📷 Scan QR Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("key")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "key"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🔑 Manual Setup Key
              </button>
            </div>

            {activeTab === "qr" ? (
              <div className="space-y-3 text-center">
                <p className="text-xs text-slate-300 font-medium">
                  Scan this QR Code in Google or Microsoft Authenticator app:
                </p>
                {qrCodeUrl ? (
                  <div className="flex justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto shadow-lg border border-slate-700">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                    Generating QR Code...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300 font-medium">1. Open Google Authenticator or Microsoft Authenticator.</p>
                <p className="text-xs text-slate-300 font-medium">2. Tap &apos;+&apos; and select &apos;Enter a setup key&apos;.</p>
                
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">Setup Key</span>
                    <code className="text-sm font-mono text-emerald-400 select-all tracking-wider">{secret}</code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleEnable} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Enter the 6-digit code shown in your Authenticator app:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-all shadow-lg shadow-emerald-500/20"
              >
                {submitting ? "Verifying..." : "Verify & Enable 2FA"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
