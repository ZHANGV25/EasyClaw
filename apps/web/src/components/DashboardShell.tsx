"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex">
      {/* ─── Sidebar ────────────────────────── */}
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />

      {/* ─── Content ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center gap-4 px-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-semibold text-[var(--color-text-primary)]">
            EasyClaw
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

