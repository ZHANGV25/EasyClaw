"use client";

import { useState, useCallback } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { BrowserViewer } from "@/components/BrowserViewer";
import { BrowserStatus } from "@/types/browser";

export default function BrowserPage() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);

  const handleStatusChange = useCallback((newStatus: BrowserStatus) => {
    setStatus(newStatus);
  }, []);

  const isLive = status?.active ?? false;

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
          <BrowserViewer onStatusChange={handleStatusChange} />
        </div>

        {/* Current Action */}
        {status?.action && (
          <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] p-6">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{status.action}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
