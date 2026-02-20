"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Reminder } from "@/types/reminders";
import { ReminderCard } from "@/components/ReminderCard";
import { Skeleton } from "@/components/Skeleton";

export default function RemindersPage() {
  const [upcoming, setUpcoming] = useState<Reminder[]>([]);
  const [past, setPast] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      setUpcoming(data.upcoming);
      setPast(data.past);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Reminder>) => {
    // Optimistic update
    setUpcoming((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    
    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update reminder:", error);
      fetchReminders(); // Revert on error
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setUpcoming((prev) => prev.filter((r) => r.id !== id));
    setPast((prev) => prev.filter((r) => r.id !== id));

    try {
      await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete reminder:", error);
      fetchReminders(); // Revert on error
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">Reminders</h1>
          <p className="text-[var(--color-text-secondary)]">Manage your scheduled tasks and alerts</p>
        </div>

        {/* Loading State */}
        {loading ? (
           <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
                      <div className="flex justify-between">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                  </div>
              ))}
           </div>
        ) : (
          <div className="space-y-12">
            
            {/* Upcoming Section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Upcoming</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-imessage-blue)] text-white">
                  {upcoming.length}
                </span>
              </div>
              
              {upcoming.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[var(--color-border)] rounded-xl">
                  <p className="text-[var(--color-text-secondary)]">No upcoming reminders.</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Ask your assistant to set one for you.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcoming.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past Section */}
            {past.length > 0 && (
              <section className="pt-8 border-t border-[var(--color-border-subtle)]">
                <button 
                  onClick={() => setShowPast(!showPast)}
                  className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
                >
                  <h2 className="text-lg font-semibold">Past Reminders</h2>
                   <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`w-5 h-5 transition-transform duration-200 ${showPast ? "rotate-90" : ""}`}
                    >
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                </button>
                
                {showPast && (
                  <div className="grid gap-4 md:grid-cols-2 opacity-70 hover:opacity-100 transition-opacity">
                    {past.map((reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
