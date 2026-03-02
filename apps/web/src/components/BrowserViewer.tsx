"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { BrowserStatus } from "@/types/browser";
import { apiGet } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";

interface BrowserViewerProps {
  onStatusChange?: (status: BrowserStatus) => void;
}

export function BrowserViewer({ onStatusChange }: BrowserViewerProps) {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const lastScreenshotAtRef = useRef<string | null>(null);
  const getToken = useAuthToken();

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await apiGet<BrowserStatus>("/api/browser/status", token);
      setStatus(data);
      onStatusChange?.(data);
    } catch (e) {
      console.error("Failed to fetch browser status", e);
    }
  }, [getToken, onStatusChange]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const isLive = status?.active ?? false;
  const url = status?.currentUrl || "about:blank";
  const hasNewScreenshot =
    status?.screenshotUrl && status.screenshotUpdatedAt !== lastScreenshotAtRef.current;

  // Track latest screenshot timestamp to avoid unnecessary re-renders
  useEffect(() => {
    if (status?.screenshotUpdatedAt) {
      lastScreenshotAtRef.current = status.screenshotUpdatedAt;
    }
  }, [status?.screenshotUpdatedAt]);

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-white/10">

      {/* Browser Chrome */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#2a2a2a] border-b border-black/20">
        {/* Traffic Lights */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* Navigation & URL Bar */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 text-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </div>

          <div className="flex-1 bg-[#1a1a1a] rounded-md px-3 py-1.5 flex items-center justify-center text-xs text-white/50 font-mono relative group">
            <span className="truncate max-w-[300px]">{url}</span>
            <div className="absolute inset-y-0 right-2 flex items-center">
                {isLive && (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
                    </div>
                )}
            </div>
          </div>

           <div className="w-4" /> {/* Spacer */}
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative bg-white w-full h-full flex items-center justify-center overflow-hidden">
        {status?.screenshotUrl ? (
            <img
                src={status.screenshotUrl}
                alt="Live Browser View"
                className="w-full h-full object-contain"
            />
        ) : isLive ? (
            <div className="flex flex-col items-center gap-4 text-black/40">
                <div className="w-10 h-10 border-3 border-black/20 border-t-black/60 rounded-full animate-spin" />
                <p className="text-sm font-medium">Agent is working...</p>
                {status?.action && (
                    <p className="text-xs text-black/30 max-w-[250px] text-center">{status.action}</p>
                )}
            </div>
        ) : (
            <div className="flex flex-col items-center gap-3 text-black/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                <p className="text-sm font-medium">Browser Offline</p>
            </div>
        )}

        {/* Completion / Failure Overlay */}
        {status?.jobStatus === "COMPLETED" && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-green-900/80 backdrop-blur text-green-100 px-6 py-4 rounded-xl border border-green-500/30 text-center">
                    <p className="text-lg font-semibold">Task Complete</p>
                    <p className="text-sm text-green-300 mt-1">The agent has finished its work.</p>
                </div>
            </div>
        )}
        {status?.jobStatus === "FAILED" && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="bg-red-900/80 backdrop-blur text-red-100 px-6 py-4 rounded-xl border border-red-500/30 text-center">
                    <p className="text-lg font-semibold">Task Failed</p>
                    <p className="text-sm text-red-300 mt-1">Something went wrong. Check the chat for details.</p>
                </div>
            </div>
        )}

        {/* Action Overlay */}
        {status?.action && (
            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 shadow-lg animate-fade-in">
                <span className="mr-2">&#9889;</span>
                {status.action}
            </div>
        )}
      </div>
    </div>
  );
}
