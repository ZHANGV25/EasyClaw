import Link from "next/link";
import HeroScrollDemo from "@/components/landing/HeroScrollDemo";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* ─── Hero (Includes Header & Footer for Scroll Sync) ────────────────────────────────── */}
      <HeroScrollDemo />
    </main>
  );
}
