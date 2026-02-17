"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const STEPS = ["Your Name", "Timezone", "Interests", "Assistant"];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.firstName ?? "",
    timezone: detectTimezone(),
    interests: "",
    assistantName: "Jarvis",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return form.name.trim().length > 0;
      case 1:
        return form.timezone.length > 0;
      case 2:
        return form.interests.trim().length > 0;
      case 3:
        return form.assistantName.trim().length > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast("success", "Your assistant is being set up! 🚀");
        router.push("/chat");
      } else {
        const error = await res.json().catch(() => ({}));
        addToast("error", error.message || "Failed to set up your assistant. Please try again.");
      }
    } catch (err) {
      console.error("Onboarding failed:", err);
      addToast("error", "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-lg">
        {/* ─── Progress ──────────────────────── */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`h-1 w-full rounded-full transition-all duration-500 ${
                  i <= step
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border)]"
                }`}
              />
              <span
                className={`text-[10px] transition-colors duration-300 ${
                  i <= step
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Card ──────────────────────────── */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 animate-fade-in">
          {/* Step 0: Name */}
          {step === 0 && (
            <div key="step-0">
              <h2 className="text-2xl font-bold mb-2">What should we call you?</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Your assistant will use this name to address you.
              </p>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Victor"
                className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent-glow)] transition-all duration-200"
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
              />
            </div>
          )}

          {/* Step 1: Timezone */}
          {step === 1 && (
            <div key="step-1">
              <h2 className="text-2xl font-bold mb-2">Where are you located?</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                This helps your assistant schedule reminders and tasks at the right time.
              </p>
              <select
                value={form.timezone}
                onChange={(e) => update("timezone", e.target.value)}
                className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent-glow)] transition-all duration-200 appearance-none cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-[var(--color-bg-secondary)]">
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <div key="step-2">
              <h2 className="text-2xl font-bold mb-2">What do you need help with?</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Tell your assistant about yourself. What are your goals, interests, or daily tasks?
              </p>
              <textarea
                autoFocus
                value={form.interests}
                onChange={(e) => update("interests", e.target.value)}
                placeholder="e.g. I'm a startup founder. I need help with research, scheduling, and writing emails..."
                rows={4}
                className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent-glow)] transition-all duration-200 resize-none"
              />
            </div>
          )}

          {/* Step 3: Assistant Name */}
          {step === 3 && (
            <div key="step-3">
              <h2 className="text-2xl font-bold mb-2">Name your assistant</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Give your AI assistant a name. You can always change this later.
              </p>
              <input
                autoFocus
                type="text"
                value={form.assistantName}
                onChange={(e) => update("assistantName", e.target.value)}
                placeholder="e.g. Jarvis, Friday, Claude..."
                className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent-glow)] transition-all duration-200"
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
              />
            </div>
          )}

          {/* ─── Actions ─────────────────────── */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canAdvance() || isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </>
              ) : step < STEPS.length - 1 ? (
                "Continue"
              ) : (
                "Launch My Assistant 🚀"
              )}
            </button>
          </div>
        </div>

        {/* ─── Step counter ──────────────────── */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-4">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
