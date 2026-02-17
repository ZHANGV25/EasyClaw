"use client";

import { useState, useMemo } from "react";
import { Artifact } from "@/types/artifacts";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
} from "@codesandbox/sandpack-react";

interface ArtifactPanelProps {
  artifact: Artifact;
  onClose: () => void;
}

type TabId = "preview" | "code" | "files";

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: "preview", label: "Preview" },
    { id: "code", label: "Code" },
    { id: "files", label: `Files (${artifact.files.length})` },
  ];

  const currentFile = artifact.files[activeFileIdx] || artifact.files[0];

  const handleCopy = async () => {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="artifact-panel flex flex-col h-full bg-[var(--color-bg-primary)] border-l border-[var(--color-border-subtle)] animate-slide-in-right">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]">
              {artifact.type === "app" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
              ) : artifact.type === "script" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              ) : artifact.type === "image" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18 13.5a9 9 0 00-9-9" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              )}
            </svg>
          </span>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {artifact.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors cursor-pointer shrink-0"
          aria-label="Close panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-[var(--color-text-secondary)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[var(--color-border-subtle)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer relative ${
              activeTab === tab.id
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "preview" && (
          <PreviewContent artifact={artifact} />
        )}

        {activeTab === "code" && currentFile && (
          <div className="flex flex-col h-full">
            {/* File name bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)] shrink-0">
              <span className="text-xs text-[var(--color-text-muted)] font-[var(--font-mono)]">
                {currentFile.name}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-[var(--color-success)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            {/* Code block */}
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-[12px] leading-[1.7] font-[var(--font-mono)] text-[var(--color-text-secondary)]">
                <code>{currentFile.content}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-3">
            <div className="space-y-0.5">
              {artifact.files.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => {
                    setActiveFileIdx(idx);
                    setActiveTab("code");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeFileIdx === idx
                      ? "bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
                      : "hover:bg-[var(--color-surface)]/50"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-[var(--color-text-muted)] shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)] truncate font-[var(--font-mono)]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {file.content.split("\n").length} lines
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Preview sub-component ─────────────────── */

function PreviewContent({ artifact }: { artifact: Artifact }) {
  const isReact =
    artifact.language === "react" ||
    artifact.language === "typescript" ||
    artifact.language === "javascript" ||
    artifact.files.some((f) => /\.(tsx|jsx)$/.test(f.name));

  const sandpackFiles = useMemo(() => {
    const files: Record<string, string> = {};
    for (const f of artifact.files) {
      // Sandpack expects paths starting with /
      const path = f.name.startsWith("/") ? f.name : `/${f.name}`;
      files[path] = f.content;
    }

    // If there's no App entry, create one that re-exports the first tsx/jsx file
    const hasApp = artifact.files.some(
      (f) =>
        f.name === "App.tsx" ||
        f.name === "App.jsx" ||
        f.name === "App.js"
    );
    if (!hasApp && isReact) {
      const first = artifact.files[0];
      if (first) {
        files["/App.tsx"] = first.content;
      }
    }

    return files;
  }, [artifact.files, isReact]);

  if (!isReact) {
    // Non-React: show a simple "preview not supported" message
    return (
      <div className="p-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <div className="text-3xl mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--color-text-muted)] mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            Live preview is available for React/JS apps
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            This {artifact.language || artifact.type} artifact can be viewed in
            the <strong>Code</strong> tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full sandpack-preview-container">
      <SandpackProvider
        template="react-ts"
        files={sandpackFiles}
        theme="dark"
        options={{
          externalResources: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
          ],
        }}
      >
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={true}
            style={{ height: "100%" }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
