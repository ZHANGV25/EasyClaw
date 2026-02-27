"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { AddCreditsModal } from "@/components/AddCreditsModal";
import { apiGet } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/Skeleton";
import { ApiError } from "@/components/ApiError";

interface UserData {
  creditsBalance: number;
  container?: {
    status: "RUNNING" | "SLEEPING" | "PROVISIONING" | "STOPPED";
  };
}

interface UsageData {
  totalCost: number;
  daily: {
    date: string;
    costUsd: number;
    messages: number;
  }[];
}

interface Transaction {
  id: string;
  type: "USAGE" | "PURCHASE" | "FREE_TIER";
  amount: number;
  description: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCredits, setShowAddCredits] = useState(false);
  const { addToast } = useToast();
  const getToken = useAuthToken();

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        const [userData, usageData, historyData] = await Promise.all([
          apiGet<UserData>("/api/user", token),
          apiGet<UsageData>("/api/usage", token),
          apiGet<{ transactions: Transaction[] }>("/api/credits/history", token),
        ]);
        setUser(userData);
        setUsage(usageData);
        setTxs(historyData.transactions);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError("Failed to load dashboard data. Please try again.");
        addToast("error", "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [addToast, getToken]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RUNNING": return "bg-[var(--color-success)]";
      case "SLEEPING": return "bg-[var(--color-warning)]";
      case "PROVISIONING": return "bg-[var(--color-accent)]";
      case "STOPPED": return "bg-[var(--color-danger)]";
      default: return "bg-[var(--color-text-muted)]";
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="space-y-8 animate-pulse">
          <Skeleton className="h-8 w-32" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-20 mb-4" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <Skeleton className="h-5 w-28 mb-6" />
            <Skeleton className="h-48 rounded" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ApiError 
          message={error} 
          onRetry={() => window.location.reload()} 
          className="h-64"
        />
      </DashboardShell>
    );
  }

  const maxDailyCost = usage ? Math.max(...usage.daily.map(d => d.costUsd)) : 0;

  return (
    <DashboardShell>
      <div className="space-y-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Overview
        </h1>

        {/* ─── Stats Cards ────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Credits */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Available Credits
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                ${user?.creditsBalance.toFixed(2)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">USD</span>
            </div>
            <button 
              onClick={() => setShowAddCredits(true)}
              className="w-full py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
            >
              Add Funds
            </button>
          </div>

          {/* Assistant Status */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Assistant Status
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${getStatusColor(user?.container?.status || "RUNNING")}`} />
              <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                {user?.container?.status || "RUNNING"}
              </span>
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Ready to process tasks.
            </div>
          </div>

          {/* Usage Today */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Usage (7d)
            </h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                ${usage?.totalCost.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              Total spent in last 7 days.
            </div>
          </div>
        </div>

        {/* ─── Usage Chart ────────────────────── */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
            Daily Usage
          </h3>
          <div className="h-48 flex items-end gap-2 sm:gap-4">
            {(!usage || usage.daily.length === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mb-3 text-[var(--color-text-muted)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] font-medium">No usage data yet</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Start chatting to see usage.</p>
                </div>
            ) : usage.daily.map((day) => {
              const heightPercent = maxDailyCost > 0 ? (day.costUsd / maxDailyCost) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative flex-1 flex items-end bg-[var(--color-bg-secondary)] rounded-t-sm overflow-hidden">
                    <div 
                      className="w-full bg-[var(--color-accent)]/80 group-hover:bg-[var(--color-accent)] transition-all duration-300 rounded-t-sm min-h-[4px]"
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none transition-opacity">
                      ${day.costUsd.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">
                    {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Transactions ───────────────────── */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Recent Activity
          </h3>
            {txs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm text-[var(--color-text-secondary)]">No activity yet</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Start chatting with your assistant to see usage here.</p>
              </div>
            ) : (
            <div className="space-y-4">
              {txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      tx.type === "PURCHASE" 
                        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : tx.type === "FREE_TIER" 
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]"
                    }`}>
                      {tx.type === "PURCHASE" ? "+" : tx.type === "FREE_TIER" ? "★" : "-"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[150px] sm:max-w-none">
                        {tx.description}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${
                    tx.amount >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-text-primary)]"
                  }`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </DashboardShell>
    );
  }
