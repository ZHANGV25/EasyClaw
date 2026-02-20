"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
            <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center shadow-xl">
                <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center text-[var(--color-danger)] mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                    Something went wrong
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mb-8 leading-relaxed">
                    We've encountered an unexpected error. Please try refreshing the page.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.href = "/"}
                        className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                        Go Home
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
