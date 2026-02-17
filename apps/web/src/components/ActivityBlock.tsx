import { useState, useEffect } from "react";
import { AgentStep } from "@/types/activity";

interface ActivityBlockProps {
  steps: AgentStep[];
  isStreaming: boolean;
}

export function ActivityBlock({ steps, isStreaming }: ActivityBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming) {
      setIsOpen(false);
    }
  }, [isStreaming]);

  if (!steps || steps.length === 0) return null;

  const activeStep = steps.find((s) => s.status === "running");

  return (
    <div className="mt-2 mb-4 border border-[var(--color-border-subtle)] rounded-lg overflow-hidden bg-[var(--color-surface)]/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
           {isStreaming ? (
             <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
           ) : (
             <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
           )}
           <span className="font-medium">
             {activeStep ? activeStep.label : `${steps.length} actions processed`}
           </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
          {steps.map((step) => (
            <div key={step.id} className="px-3 py-2 text-xs">
              <div className="flex items-start gap-2">
                <StepIcon type={step.type} status={step.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--color-text-primary)]">
                       {step.label}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-[10px]">
                      {step.durationMs ? `${step.durationMs}ms` : step.status}
                    </span>
                  </div>
                  
                  {step.content && (
                     <div className="mt-1 text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono bg-black/5 p-1.5 rounded">
                       {step.content}
                     </div>
                  )}
                  
                  {step.output && (
                    <div className="mt-1 text-[var(--color-text-muted)] border-l-2 border-[var(--color-border)] pl-2 italic">
                       {step.output}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepIcon({ type, status }: { type: string; status: string }) {
   if (status === "running") {
     return <div className="w-3 h-3 mt-0.5 border border-current border-t-transparent rounded-full animate-spin text-[var(--color-warning)] shrink-0" />;
   }

   switch (type) {
     case "thought":
       return (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mt-0.5 text-[var(--color-text-muted)] shrink-0">
           <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
         </svg>
       );
     case "tool-call":
       return (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mt-0.5 text-[var(--color-accent)] shrink-0">
           <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.9a.75.75 0 10-1.06 1.06 3.5 3.5 0 01-.568 2.682l-1.625 2.375a.75.75 0 101.236.845l1.625-2.375a2 2 0 00.324-1.556l.94-1.353a.75.75 0 00-1.06-1.061l-2.41 3.468a.75.75 0 01-1.036.143l-.175-.118a.75.75 0 01.826-1.258l.186.124.904-1.3a3.5 3.5 0 013.896-.68z" clipRule="evenodd" />
         </svg>
       );
     case "terminal":
       return (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mt-0.5 text-[var(--color-text-primary)] shrink-0">
           <path clipRule="evenodd" fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm5.03 4.22a.75.75 0 010 1.06l-2.22 2.22a.75.75 0 11-1.06-1.06l1.69-1.69-1.69-1.69a.75.75 0 111.06-1.06l2.22 2.22zm2.97 3.03a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5z" />
         </svg>
       );
     default:
       return <div className="w-3.5 h-3.5 mt-0.5 rounded-full bg-[var(--color-surface-hover)] shrink-0" />;
   }
}
