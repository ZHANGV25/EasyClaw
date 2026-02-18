import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import HeroScrollDemo from "@/components/landing/HeroScrollDemo";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* ─── Header ──────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-[var(--color-border)]/50 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight text-[var(--color-text-primary)]">
              EasyClaw
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">
                  Log in
                </button>
              </SignInButton>
              {/* Minimal Sign Up Button */}
              {/* <Link
                href="/sign-up"
                className="text-sm font-medium text-[var(--color-text-primary)] hover:text-white transition-colors"
              >
                Sign Up
              </Link> */}
            </SignedOut>
            <SignedIn>
              <Link
                href="/chat"
                className="text-sm font-medium text-[var(--color-text-primary)] hover:text-white transition-colors"
              >
                Enter
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────── */}
      <HeroScrollDemo />

      {/* ─── Footer ──────────────────────────────── */}
      <footer className="fixed bottom-0 w-full py-6 px-8 pointer-events-none z-40 mix-blend-difference">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
          <span>EasyClaw Intelligence</span>
          <span className="hidden md:inline">Private Assistant</span>
          <span>© 2026</span>
        </div>
      </footer>
    </main>
  );
}
