import Link from "next/link";

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
          <nav className="flex items-center gap-6">
            <Link
              href="/chat"
              className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)]"
            >
              Try It Free
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────── */}
      <section className="flex-1 flex items-center justify-center px-6 pt-24">
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
              href="/chat"
              className="px-8 py-3.5 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-all duration-300 animate-pulse-glow"
            >
              Start Chatting — It&apos;s Free
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium text-base hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200"
            >
              See How It Works
            </a>
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
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all duration-300 group hover:translate-y-[-2px]"
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
