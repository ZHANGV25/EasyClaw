"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";

type AddCreditsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddCreditsModal({ isOpen, onClose }: AddCreditsModalProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const getToken = useAuthToken();

  if (!isOpen) return null;

  const handlePurchase = async (amount: number) => {
    setLoading(amount);
    try {
      const token = await getToken();
      const res = await apiPost<{ checkoutUrl: string }>("/api/credits/purchase", { amountUsd: amount }, token);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      console.error("Purchase failed", err);
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Add Credits
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          You've run out of credits. Top up to continue chatting with your assistant.
        </p>

        <div className="space-y-3">
          {[5, 10, 20].map((amount) => (
            <button
              key={amount}
              onClick={() => handlePurchase(amount)}
              disabled={loading !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)] transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-sm font-bold group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors">
                  ${amount}
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {amount * 1000} Credits
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    ~{(amount * 50).toFixed(0)} messages
                  </p>
                </div>
              </div>
              {loading === amount ? (
                <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  ${amount.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-[var(--color-text-muted)] mt-6">
          Payments are processed securely via Stripe.
        </p>
      </div>
    </div>
  );
}
