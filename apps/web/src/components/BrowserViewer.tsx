"use client";

import { useEffect, useState, useRef } from "react";
import { BrowserFrame } from "@/types/browser";

interface BrowserViewerProps {
  initialUrl?: string;
  isLive?: boolean;
}

export function BrowserViewer({ initialUrl = "about:blank", isLive = false }: BrowserViewerProps) {
  const [frame, setFrame] = useState<BrowserFrame | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [url, setUrl] = useState(initialUrl);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isLive) return;

    // Connect to SSE stream
    const eventSource = new EventSource("/api/browser/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setFrame(data);
        if (data.url) setUrl(data.url);
      } catch (e) {
        console.error("Failed to parse browser frame", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Browser stream error", err);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [isLive]);

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-white/10">
      
      {/* ─── Browser Chrome ─── */}
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

      {/* ─── Viewport ─── */}
      <div className="flex-1 relative bg-white w-full h-full flex items-center justify-center overflow-hidden">
        {isConnected && frame?.screenshotBase64 ? (
            <img 
                src={frame.screenshotBase64} 
                alt="Live Browser View" 
                className="w-full h-full object-contain"
            />
        ) : (
            <div className="flex flex-col items-center gap-3 text-black/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                <p className="text-sm font-medium">{isLive ? "Connecting to agent..." : "Browser Offline"}</p>
            </div>
        )}

        {/* Status Overlay */}
        {frame?.action && (
            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10 shadow-lg animate-fade-in">
                {frame.status === "interacting" && <span className="mr-2">⚡</span>}
                {frame.action}
            </div>
        )}
      </div>
    </div>
  );
}
