"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiGet } from "@/lib/api";

interface UserData {
  creditsBalance: number;
  container: {
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

  useEffect(() => {
    async function fetchData() {
      try {
        const [userData, usageData, historyData] = await Promise.all([
          apiGet<UserData>("/api/user"),
          apiGet<UsageData>("/api/usage"),
          apiGet<{ transactions: Transaction[] }>("/api/credits/history"),
        ]);
        setUser(userData);
        setUsage(usageData);
        setTxs(historyData.transactions);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
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
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Available Credits
            </h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                ${user?.creditsBalance.toFixed(2)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">USD</span>
            </div>
            <button className="w-full py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors">
              Add Funds
            </button>
          </div>

          {/* Assistant Status */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Assistant Status
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${getStatusColor(user?.container.status || "")}`} />
              <span className="text-lg font-semibold text-[var(--color-text-primary)]">
                {user?.container.status}
              </span>
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              {user?.container.status === "SLEEPING" 
                ? "Wakes up automatically when you chat."
                : "Ready to process tasks."}
            </div>
          </div>

          {/* Usage Today */}
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
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
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
            Daily Usage
          </h3>
          <div className="h-48 flex items-end gap-2 sm:gap-4">
            {usage?.daily.map((day) => {
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
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Recent Activity
          </h3>
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
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {tx.description}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  tx.amount >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-text-primary)]"
                }`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
