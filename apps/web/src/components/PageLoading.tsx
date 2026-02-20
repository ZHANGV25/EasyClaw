import React from "react";

export default function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] w-full bg-[var(--color-bg-primary)]">
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-[var(--color-accent)] animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] font-medium animate-pulse">
        Loading...
      </p>
    </div>
  );
}
