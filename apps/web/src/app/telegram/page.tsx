"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiPost, apiGet } from "@/lib/api";
import { ApiError } from "@/components/ApiError";

export default function TelegramPage() {
  const [loading, setLoading] = useState(false);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for connection status when botUrl is set/generated
  useEffect(() => {
    if (!botUrl || connected) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiGet<{ connected: boolean }>("/api/telegram/connect");
        if (res.connected) {
          setConnected(true);
          clearInterval(interval);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [botUrl, connected]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ botUrl: string; connected: boolean }>("/api/telegram/connect", {});
      setBotUrl(res.botUrl);
      // Automatically open in new tab
      window.open(res.botUrl, "_blank");
    } catch (err) {
      console.error("Failed to get Telegram link", err);
      setError("Failed to generate Telegram link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in text-center pt-10">
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-colors duration-500 ${
          connected ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[#229ED9]/10 text-[#229ED9]"
        }`}>
          {connected ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 animate-scale-in">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          {connected ? "Telegram Connected!" : "Connect Telegram"}
        </h1>
        
        <p className="text-[var(--color-text-secondary)] text-lg">
          {connected 
            ? "Your assistant can now chat with you on Telegram. Try sending a message!"
            : "Chat with your assistant on the go. Get notifications and send tasks directly from Telegram."
          }
        </p>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-auto">
          {connected ? (
             <div className="space-y-6">
              <div className="space-y-2">
                 <p className="text-sm text-[var(--color-text-success)] font-medium">
                  Connection Active
                 </p>
                 <p className="text-xs text-[var(--color-text-muted)]">
                  You can close this tab now.
                 </p>
              </div>
              <a 
                href={botUrl || "#"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium transition-colors"
              >
                Open Chat
              </a>
             </div>
          ) : botUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Scan the QR code or click the button below:
              </p>
              {/* Mock QR Code */}
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(botUrl)}`} 
                  alt="Telegram QR" 
                  className="w-full h-full"
                />
              </div>
              <a 
                href={botUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-lg bg-[#229ED9] text-white font-medium hover:bg-[#1d8abf] transition-colors"
              >
                Open Telegram
              </a>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-sm text-[var(--color-text-primary)]">Generate your secure link</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-sm text-[var(--color-text-primary)]">Click "Start" in Telegram</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-sm text-[var(--color-text-primary)]">Chat instantly!</span>
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#229ED9] text-white font-medium hover:bg-[#1d8abf] disabled:opacity-50 transition-colors"
              >
                {loading ? "Generating Link..." : "Generate Link"}
              </button>
            </div>
          )}

          
          {error && (
            <div className="mt-6">
              <ApiError message={error} onRetry={handleConnect} />
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
