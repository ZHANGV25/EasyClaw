import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ─── Header ──────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-sm">
              EC
            </div>
            <span className="text-lg font-semibold text-[var(--color-text-primary)]">
              EasyClaw
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">
                  Sign In
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)]"
              >
                Try It Free
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/chat"
                className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)]"
              >
                Open Chat
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────── */}
      <section className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-3xl text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            Now in Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your Private{" "}
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-[#a78bfa] bg-clip-text text-transparent">
              AI Assistant
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
            An always-on personal assistant that remembers you, handles tasks,
            and works 24/7. No setup, no API keys, no terminal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-3.5 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-all duration-300 animate-pulse-glow"
            >
              Start Chatting — It&apos;s Free
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium text-base hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-[var(--color-bg-secondary)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Up and running in 60 seconds
          </h2>
          <p className="text-center text-[var(--color-text-secondary)] mb-16 max-w-lg mx-auto">
            No servers, no API keys, no downloads. Just sign up and start talking.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sign Up",
                desc: "Create a free account. Tell us your name and what you need help with.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-accent)]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Start Talking",
                desc: "Chat with your assistant from the web or connect via Telegram.",
                icon: "💬",
              },
              {
                step: "03",
                title: "Let It Work",
                desc: "Your assistant remembers you, handles tasks, and runs 24/7 in the background.",
                icon: "🚀",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all duration-300 group hover:translate-y-[-2px]"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-1 rounded-md">
                    {item.step}
                  </span>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            What your assistant can do
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "💬",
                title: "Chat Anywhere",
                desc: "Web, Telegram, or text. Talk to your assistant from wherever you are.",
              },
              {
                icon: "🧠",
                title: "Remembers You",
                desc: "Your assistant builds a memory of your preferences, routines, and history.",
              },
              {
                icon: "⚡",
                title: "Always On",
                desc: "Reminders, research, and tasks running in the background — even when you're asleep.",
              },
              {
                icon: "🔒",
                title: "Private & Isolated",
                desc: "Your own container. Your data never touches another user's.",
              },
              {
                icon: "📊",
                title: "Pay What You Use",
                desc: "Start free. Only pay for what you use. No subscriptions, no surprises.",
              },
              {
                icon: "🤖",
                title: "Best AI Models",
                desc: "Powered by Claude, GPT-4, and Gemini. We pick the best model for each task.",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all duration-300 group hover:translate-y-[-2px]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-[var(--color-bg-secondary)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, usage-based pricing</h2>
          <p className="text-[var(--color-text-secondary)] mb-16 max-w-lg mx-auto">
            Start free. No credit card required. Only pay for what you actually use.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-left">
              <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Free Tier
              </div>
              <div className="text-4xl font-bold mb-1">$0</div>
              <div className="text-sm text-[var(--color-text-muted)] mb-6">
                $1.00 free credits included
              </div>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Private AI assistant
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Web &amp; Telegram access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Memory &amp; personalization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  No credit card required
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 block w-full text-center px-6 py-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-medium text-sm hover:bg-[var(--color-bg-elevated)] transition-all duration-200"
              >
                Get Started
              </Link>
            </div>

            {/* Usage */}
            <div className="p-8 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-accent)] text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[var(--color-accent)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <div className="text-sm font-medium text-[var(--color-accent)] mb-2">
                Pay As You Go
              </div>
              <div className="text-4xl font-bold mb-1">
                $<span className="text-2xl">varies</span>
              </div>
              <div className="text-sm text-[var(--color-text-muted)] mb-6">
                Top up credits anytime
              </div>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Unlimited usage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  Usage dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  No surprise bills — auto-pause at $0
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 block w-full text-center px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)]"
              >
                Start Free, Upgrade Later
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to meet your assistant?
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Sign up in seconds. No credit card, no setup, no nonsense.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-8 py-3.5 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-all duration-300 animate-pulse-glow"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────── */}
      <footer className="border-t border-[var(--color-border-subtle)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>© 2026 EasyClaw</span>
          <span>Built at CMU 🎓</span>
        </div>
      </footer>
    </main>
  );
}
