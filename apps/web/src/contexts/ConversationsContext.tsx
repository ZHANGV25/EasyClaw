"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, apiGet, apiPost, apiDelete } from "@/lib/api";

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  createdAt: string;
}

interface ConversationsContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue>({
  conversations: [],
  isLoading: true,
  activeId: null,
  setActiveId: () => { },
  createConversation: async () => ({ id: "", title: "", lastMessage: "", updatedAt: "", createdAt: "" }),
  deleteConversation: async () => { },
  renameConversation: async () => { },
  refreshConversations: async () => { },
});

export function useConversations() {
  return useContext(ConversationsContext);
}

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();

  const refreshConversations = useCallback(async () => {
    try {
      const data = await apiGet<{ conversations: Conversation[] }>("/api/conversations");
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const createConversation = useCallback(
    async (title?: string) => {
      const conv = await apiPost<Conversation>("/api/conversations", {
        title: title || "New Chat",
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      router.push(`/chat/${conv.id}`);
      return conv;
    },
    [router]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await apiDelete(`/api/conversations?id=${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        // Navigate to /chat (new chat) if the active conversation is deleted
        setActiveId(null);
        router.push("/chat");
      }
    },
    [activeId, router]
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/api/conversations?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    // Or add apiPatch to api.ts. For now, native fetch is fine or I can add apiPatch.
    // Let's use apiPost/apiGet/apiDelete as existing. I will use native fetch for PATCH or add apiPatch if I want consistency.
    // Let's add apiPatch to api.ts quickly or just use fetch here. 
    // Wait, I should probably stick to consistency. I checked api.ts and it has apiGet, apiPost, apiDelete.
    // I can just use the generic api function: api("/api/conversations...", { method: "PATCH", json: { title } })

    await api(`/api/conversations?id=${id}`, {
      method: "PATCH",
      json: { title }
    });

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        isLoading,
        activeId,
        setActiveId,
        createConversation,
        deleteConversation,
        renameConversation,
        refreshConversations,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}
