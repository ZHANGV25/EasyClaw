"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MemoryCategory, MemoryFact, Learning, MemoryResponse } from "@/types/memory";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { RecentLearningItem } from "@/components/memory/RecentLearningItem";
import { Brain, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet, apiPost, apiDelete, api } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";

const CATEGORIES: MemoryCategory[] = [
  "personal",
  "health",
  "travel",
  "food",
  "schedule",
  "other",
];

export default function MemoryPage() {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [recentLearnings, setRecentLearnings] = useState<Learning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getToken = useAuthToken();

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await apiGet<MemoryResponse>("/api/memory", token);
      setFacts(data.facts);
      setRecentLearnings(data.recentLearnings);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddFact = async (category: MemoryCategory, fact: string) => {
    try {
      const token = await getToken();
      const newFact = await apiPost<MemoryFact>("/api/memory", { category, fact }, token);
      setFacts([...facts, newFact]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateFact = async (id: string, fact: string) => {
    try {
      const token = await getToken();
      await api(`/api/memory/${id}`, { method: "PUT", json: { fact }, authToken: token });
      setFacts(facts.map((f) => (f.id === id ? { ...f, fact } : f)));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteFact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fact?")) return;
    try {
      const token = await getToken();
      await apiDelete(`/api/memory/${id}`, token);
      setFacts(facts.filter((f) => f.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmLearning = async (id: string) => {
    try {
      const token = await getToken();
      await apiPost(`/api/memory/${id}/confirm`, {}, token);
      setRecentLearnings(
        recentLearnings.map((l) =>
          l.id === id ? { ...l, status: "confirmed" } : l
        )
      );
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectLearning = async (id: string) => {
    try {
      const token = await getToken();
      await apiPost(`/api/memory/${id}/reject`, {}, token);
      setRecentLearnings(
        recentLearnings.filter((l) => l.id !== id)
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Memory</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            What your assistant knows about you
          </p>
          
          <Alert className="rounded-xl border border-border border-l-4 border-l-primary shadow-sm bg-card mt-2">
            <Info className="h-4 w-4" />
            <AlertTitle>Privacy Control</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Your assistant learns from your conversations to serve you better. You can review, edit, or delete anything here.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Categorized Facts */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">Profile Knowledge</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map((category) => (
                <MemoryCard
                  key={category}
                  category={category}
                  facts={facts.filter((f) => f.category === category)}
                  onAddFact={handleAddFact}
                  onUpdateFact={handleUpdateFact}
                  onDeleteFact={handleDeleteFact}
                />
              ))}
            </div>
          </div>

          {/* Sidebar: Recent Learnings */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">Recent Learnings</h2>
            <div className="flex flex-col gap-3">
              {recentLearnings
                .filter(l => l.status === 'pending') // Only show pending for review? Or all? Prompt says "Timeline... Each item can be confirmed or rejected"
                .length === 0 && (
                  <p className="text-sm text-muted-foreground">No new learnings to review.</p>
                )}
              {recentLearnings
                .filter(l => l.status === 'pending')
                .map((learning) => (
                <RecentLearningItem
                  key={learning.id}
                  learning={learning}
                  onConfirm={handleConfirmLearning}
                  onReject={handleRejectLearning}
                />
              ))}
              
              {recentLearnings.some(l => l.status === 'confirmed') && (
                <div className="pt-4 border-t border-border mt-4">
                   <h3 className="text-sm font-medium mb-3 text-muted-foreground">Confirmed History</h3>
                   <div className="space-y-3 opacity-75">
                      {recentLearnings
                        .filter(l => l.status === 'confirmed')
                        .map((learning) => (
                           <div key={learning.id} className="text-sm p-3 rounded-xl border border-border border-l-4 border-l-green-500 shadow-sm bg-card">
                              <p>{learning.fact}</p>
                              <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
                           </div>
                        ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
