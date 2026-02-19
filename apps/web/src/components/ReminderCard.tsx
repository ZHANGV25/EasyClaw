"use client";

import { Reminder } from "@/types/reminders";
import { useState } from "react";

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: (id: string, updates: Partial<Reminder>) => void;
  onDelete: (id: string) => void;
}

export function ReminderCard({ reminder, onUpdate, onDelete }: ReminderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPast = reminder.status === "completed" || reminder.status === "expired";
  const isPaused = reminder.status === "paused";

  const getBorderColor = () => {
    if (isPaused) return "border-l-[var(--color-warning)]";
    if (isPast) return "border-l-[var(--color-border)]";
    return "border-l-[var(--color-imessage-blue)]";
  };

  const getStatusBadge = () => {
    if (isPaused) return <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)]">Paused</span>;
    if (reminder.status === "completed") return <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">Completed</span>;
    if (reminder.status === "expired") return <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)]">Expired</span>;
    return null;
  };

  return (
    <div
      className={`relative p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 ${getBorderColor()} shadow-sm transition-all hover:shadow-md`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDeleting(false);
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium text-[var(--color-text-primary)] ${isPast ? "opacity-70" : ""}`}>
              {reminder.text}
            </h3>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              <span>{reminder.schedule.humanReadable}</span>
            </div>
            {reminder.schedule.recurrence !== "one-time" && (
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311h-2.433a.75.75 0 000 1.5h4.242z" clipRule="evenodd" />
                </svg>
                <span className="capitalize">{reminder.schedule.recurrence}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered || isDeleting ? "opacity-100" : "opacity-0 md:opacity-0"}`}>
          {!isPast && (
             <button
               onClick={() => onUpdate(reminder.id, { status: isPaused ? "active" : "paused" })}
               className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
               title={isPaused ? "Resume" : "Pause"}
             >
               {isPaused ? (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                   <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.9a.75.75 0 10-1.06 1.06 3.5 3.5 0 01-.568 2.682l-1.625 2.375a.75.75 0 101.236.845l1.625-2.375a2 2 0 00.324-1.556l.94-1.353a.75.75 0 00-1.06-1.061l-2.41 3.468a.75.75 0 01-1.036.143l-.175-.118a.75.75 0 01.826-1.258l.186.124.904-1.3a3.5 3.5 0 013.896-.68z" clipRule="evenodd" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                   <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                 </svg>
               )}
             </button>
          )}

          {isDeleting ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-[var(--color-text-muted)]">Sure?</span>
              <button
                onClick={() => onDelete(reminder.id)}
                className="text-xs font-medium text-[var(--color-danger)] hover:underline"
              >
                Yes
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] transition-colors"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
