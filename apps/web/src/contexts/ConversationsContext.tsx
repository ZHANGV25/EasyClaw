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
import { api, apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthToken } from "@/hooks/useAuthToken";

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
  const getToken = useAuthToken();

  const refreshConversations = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await apiGet<{ conversations: Conversation[] }>("/api/conversations", token);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const createConversation = useCallback(
    async (title?: string) => {
      const token = await getToken();
      const conv = await apiPost<Conversation>("/api/conversations", {
        title: title || "New Chat",
      }, token);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      router.push(`/chat/${conv.id}`);
      return conv;
    },
    [router, getToken]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const token = await getToken();
      await apiDelete(`/api/conversations?id=${id}`, token);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        router.push("/chat");
      }
    },
    [activeId, router, getToken]
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    const token = await getToken();
    await apiPatch(`/api/conversations?id=${id}`, { title }, token);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, [getToken]);

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
