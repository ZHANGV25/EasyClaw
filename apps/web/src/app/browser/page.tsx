"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { BrowserViewer } from "@/components/BrowserViewer";
import { BrowserStatus } from "@/types/browser";

export default function BrowserPage() {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<BrowserStatus | null>(null);

  // Poll for status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/browser/status");
        const data = await res.json();
        setStatus(data);
        setIsLive(data.active);
      } catch (e) {
        console.error("Failed to fetch browser status", e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light tracking-tight text-[var(--color-text-primary)]">Live Browser</h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {isLive ? "Agent Active" : "Agent Idle"}
            </span>
          </div>
        </div>

        <div className="aspect-[16/10] w-full">
          <BrowserViewer isLive={isLive} />
        </div>

        {/* Recent Activity Timeline */}
        <div className="space-y-4">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">Recent Actions</h2>
            <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6">
                <div className="relative border-l border-[var(--color-border-subtle)] space-y-8 ml-3">
                    {[
                        { time: "2 mins ago", action: "Filled flight search form", details: "SFO to TYO, Dec 20-27" },
                        { time: "5 mins ago", action: "Navigated to Google Flights", details: "google.com/travel/flights" },
                        { time: "6 mins ago", action: "Received user request", details: "\"Find flights to Tokyo for Christmas\"" },
                    ].map((item, i) => (
                        <div key={i} className="relative pl-6">
                            <div className="absolute top-1.5 -left-[5px] w-2.5 h-2.5 rounded-full bg-[var(--color-border)] border-2 border-[var(--color-surface)]" />
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.action}</p>
                                <span className="text-xs text-[var(--color-text-muted)] font-mono">{item.time}</span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{item.details}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </DashboardShell>
  );
}
