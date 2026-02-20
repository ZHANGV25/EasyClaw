import React from "react";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({ 
  message = "Failed to load data", 
  onRetry,
  className = ""
}: ApiErrorProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center text-[var(--color-danger)] mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Something went wrong</p>
      <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-xs">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
