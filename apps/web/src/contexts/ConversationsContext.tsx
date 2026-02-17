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
  setActiveId: () => {},
  createConversation: async () => ({ id: "", title: "", lastMessage: "", updatedAt: "", createdAt: "" }),
  deleteConversation: async () => {},
  renameConversation: async () => {},
  refreshConversations: async () => {},
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
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
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
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "New Chat" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const conv: Conversation = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      router.push(`/chat/${conv.id}`);
      return conv;
    },
    [router]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/conversations?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
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
    const res = await fetch(`/api/conversations?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to rename conversation");
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
