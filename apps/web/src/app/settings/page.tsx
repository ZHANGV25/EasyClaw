"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { ApiError } from "@/components/ApiError";

interface UserProfile {
  name: string;
  timezone: string;
}

interface AssistantConfig {
  interests: string;
  name: string;
}

interface Secret {
  id: string;
  key: string;
  createdAt: string;
}

const TABS = [
  { id: "general", label: "General" },
  { id: "assistant", label: "Assistant" },
  { id: "vault", label: "Vault" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data
  const [profile, setProfile] = useState<UserProfile>({ name: "", timezone: "" });
  const [assistant, setAssistant] = useState<AssistantConfig>({ name: "", interests: "" });
  const [secrets, setSecrets] = useState<Secret[]>([]);

  // Vault form
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [userData, vaultData] = await Promise.all([
          apiGet<{ name: string; timezone: string; assistant: AssistantConfig }>("/api/user"),
          apiGet<{ secrets: Secret[] }>("/api/vault"),
        ]);
        setProfile({ name: userData.name, timezone: userData.timezone });
        setAssistant(userData.assistant);
        setSecrets(vaultData.secrets);
      } catch (err) {
        console.error("Failed to load settings", err);
        setError("Failed to load settings. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Mock API call to update profile
      await new Promise((r) => setTimeout(r, 600));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretKey || !newSecretValue) return;

    setSaving(true);
    try {
      const res = await apiPost<{ success: boolean; secret: Secret }>("/api/vault", {
        key: newSecretKey,
        value: newSecretValue,
      });
      setSecrets([...secrets, res.secret]);
      setNewSecretKey("");
      setNewSecretValue("");
      setMessage({ type: "success", text: "Secret added to vault." });
    } catch {
      setMessage({ type: "error", text: "Failed to add secret." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSecret = async (id: string) => {
    if (!confirm("Are you sure you want to delete this secret? This action cannot be undone.")) return;
    
    try {
      await apiDelete(`/api/vault?id=${id}`);
      setSecrets(secrets.filter((s) => s.id !== id));
      setMessage({ type: "success", text: "Secret deleted." });
    } catch {
      setMessage({ type: "error", text: "Failed to delete secret." });
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="max-w-4xl space-y-8 animate-pulse">
            <Skeleton className="h-8 w-32 mb-8" />
            <div className="flex border-b border-[var(--color-border-subtle)] gap-6">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-16" />
            </div>
            <div className="space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full max-w-md rounded-xl" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-10 w-full max-w-md rounded-xl" />
                </div>
            </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <ApiError
          message={error}
          onRetry={() => window.location.reload()}
          className="h-96"
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl space-y-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>

        {/* ─── Tabs ───────────────────────────── */}
        <div className="flex border-b border-[var(--color-border-subtle)] overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Feedback Message ───────────────── */}
        {message && (
          <div
            className={`p-4 rounded-lg text-sm border ${
              message.type === "success"
                ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]"
                : "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ─── General Tab ────────────────────── */}
        {activeTab === "general" && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full max-w-md rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:bg-[var(--color-bg-elevated)] focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Timezone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full max-w-md rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] appearance-none cursor-pointer"
                >
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)]"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* ─── Assistant Tab ──────────────────── */}
        {activeTab === "assistant" && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={assistant.name}
                  onChange={(e) => setAssistant({ ...assistant, name: e.target.value })}
                  className="w-full max-w-md rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:bg-[var(--color-bg-elevated)] focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  About You &amp; Instructions
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  Tell your assistant about your role, preferences, and how it should behave.
                </p>
                <textarea
                  rows={6}
                  value={assistant.interests}
                  onChange={(e) => setAssistant({ ...assistant, interests: e.target.value })}
                  className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:bg-[var(--color-bg-elevated)] focus:border-[var(--color-accent)] resize-vertical transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Update Assistant"}
            </button>
          </div>
        )}

        {/* ─── Vault Tab ──────────────────────── */}
        {activeTab === "vault" && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border-subtle)] rounded-lg p-4 text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">Secure Vault:</strong> Store API keys and secrets here. Your assistant can access them securely, but they are never shown again once saved.
            </div>

            {/* List Secrets */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Active Secrets
              </h3>
              {secrets.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/50">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] mb-3">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <p className="text-[var(--color-text-secondary)] font-medium">No secrets stored</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto">
                        Add API keys or passwords for your assistant to use securely.
                    </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {secrets.map((secret) => (
                    <div
                      key={secret.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-[var(--color-text-secondary)]">
                          🔒
                        </div>
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] font-mono truncate">
                            {secret.key}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Added {new Date(secret.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSecret(secret.id)}
                        className="text-xs text-[var(--color-danger)] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Secret Form */}
            <div className="pt-6 border-t border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
                Add New Secret
              </h3>
              <form onSubmit={handleAddSecret} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NOTION_API_KEY"
                    value={newSecretKey}
                    onChange={(e) => setNewSecretKey(e.target.value.toUpperCase().replace(/\s/g, "_"))}
                    className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-[var(--color-bg-elevated)] focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                    Secret Value
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="sk-..."
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-[var(--color-bg-elevated)] focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newSecretKey || !newSecretValue || saving}
                  className="px-6 py-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold uppercase tracking-widest text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {saving ? "Adding..." : "Add to Vault"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
