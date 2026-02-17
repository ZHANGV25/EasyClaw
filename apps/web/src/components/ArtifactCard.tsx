"use client";

import { Artifact } from "@/types/artifacts";

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (id: string) => void;
}

const TYPE_ICONS: Record<Artifact["type"], React.ReactNode> = {
  app: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  ),
  script: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  document: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent)]">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18 13.5a9 9 0 00-9-9" />
    </svg>
  ),
};

const LANG_LABELS: Record<string, string> = {
  react: "React",
  python: "Python",
  markdown: "Markdown",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

export function ArtifactCard({ artifact, onOpen }: ArtifactCardProps) {
  const firstFile = artifact.files[0];
  const codePreview = firstFile
    ? firstFile.content.split("\n").slice(0, 8).join("\n")
    : "";

  const handleDownload = () => {
    if (artifact.files.length === 1) {
      const file = artifact.files[0];
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Multi-file: download first file for now (zip requires a library)
      const file = artifact.files[0];
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const time = new Date(artifact.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <span className="shrink-0">{TYPE_ICONS[artifact.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {artifact.title}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {LANG_LABELS[artifact.language || ""] || artifact.language || artifact.type} · {time}
          </p>
        </div>
        {artifact.status === "generating" && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[10px] text-[var(--color-accent)] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Generating
          </span>
        )}
        {artifact.status === "error" && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-danger)]/10 text-[10px] text-[var(--color-danger)] font-semibold">
            Error
          </span>
        )}
      </div>

      {/* Code Preview */}
      {codePreview && (
        <div className="px-4 py-3 bg-[var(--color-bg-primary)]/50 border-b border-[var(--color-border-subtle)] overflow-hidden max-h-[140px]">
          <pre className="text-[11px] leading-[1.6] text-[var(--color-text-secondary)] font-[var(--font-mono)] overflow-hidden whitespace-pre">
            {codePreview}
          </pre>
          <div className="h-6 bg-gradient-to-t from-[var(--color-bg-primary)]/80 to-transparent -mt-6 relative" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          onClick={() => onOpen(artifact.id)}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:bg-[var(--color-accent-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-accent-glow)] cursor-pointer"
        >
          Open
        </button>
        <button
          onClick={() => onOpen(artifact.id)}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] transition-colors cursor-pointer"
        >
          Code
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] transition-colors cursor-pointer"
        >
          Download
        </button>
      </div>
    </div>
  );
}
