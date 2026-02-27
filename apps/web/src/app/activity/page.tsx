"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Task } from "@/types/activity";
import { ActivityBlock } from "@/components/ActivityBlock";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";

export default function ActivityPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const getToken = useAuthToken();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await apiGet<{ tasks: Task[] }>(`/api/activity?filter=${filter}&search=${search}`, token);
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  }, [filter, search, getToken]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">Activity</h1>
          <p className="text-[var(--color-text-secondary)]">Everything your assistant has done</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            {["all", "today", "week", "month"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
          />
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
                      <div className="flex items-start justify-between">
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-64" />
                         </div>
                         <Skeleton className="h-4 w-16" />
                      </div>
                   </div>
                ))}
             </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[var(--color-border)] rounded-xl">
              <p className="text-lg text-[var(--color-text-secondary)] mb-4">No activity yet.</p>
              <Link
                href="/chat"
                className="inline-flex items-center text-[var(--color-imessage-blue)] hover:underline"
              >
                Start a conversation →
              </Link>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)] transition-all hover:bg-[var(--color-surface-hover)] shadow-sm hover:shadow-md"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(task.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          task.status === "completed"
                            ? "bg-[var(--color-success)]"
                            : task.status === "failed"
                            ? "bg-[var(--color-danger)]"
                            : "bg-[var(--color-warning)]"
                        }`}
                      />
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {new Date(task.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                      {task.summary}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/chat/${task.conversationId}`}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Chat
                    </Link>
                    <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                      {expandedTaskId === task.id ? (
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                           <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01.02 1.06z" clipRule="evenodd" />
                         </svg>
                      ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                           <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                         </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTaskId === task.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                    <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                      Execution Steps
                    </h4>
                    <div className="space-y-3">
                      {task.steps.length > 0 ? (
                        <ActivityBlock
                          steps={task.steps}
                          isStreaming={false}
                        />
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)] italic">
                          No detailed steps available for this task.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
