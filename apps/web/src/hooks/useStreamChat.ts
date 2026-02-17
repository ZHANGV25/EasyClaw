"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Artifact } from "@/types/artifacts";
import { AgentStep } from "@/types/activity";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  artifact?: Artifact;
  activity?: import("@/types/activity").AgentStep[];
}

export interface UsageData {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

interface HistoryResponse {
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }[];
  hasMore: boolean;
}

interface UseStreamChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isWaking: boolean;
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
  showAddCreditsModal: boolean;
  setShowAddCreditsModal: (show: boolean) => void;
  lastUsage: UsageData | null;
  sendMessage: (content: string) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm your EasyClaw assistant. I can help you with research, reminders, writing, and everyday tasks. What can I help you with?",
  timestamp: new Date(),
};

export function useStreamChat(conversationId?: string): UseStreamChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [lastUsage, setLastUsage] = useState<UsageData | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const loadedConvRef = useRef<string | null>(null);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      // New conversation — show welcome message
      setMessages([WELCOME_MESSAGE]);
      setHasMoreHistory(false);
      loadedConvRef.current = null;
      return;
    }

    // Don't reload if already loaded
    if (loadedConvRef.current === conversationId) return;
    loadedConvRef.current = conversationId;

    async function loadMessages() {
      setIsLoadingHistory(true);
      setMessages([]);
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages?limit=50`
        );
        if (!res.ok) throw new Error("Failed to load messages");
        const data: HistoryResponse = await res.json();

        if (data.messages.length > 0) {
          const msgs: ChatMessage[] = data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
          setMessages(msgs);
          setHasMoreHistory(data.hasMore);
        } else {
          setMessages([WELCOME_MESSAGE]);
          setHasMoreHistory(false);
        }
      } catch (err) {
        console.error("Failed to load conversation messages", err);
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadMessages();
  }, [conversationId]);

  // Load more (older) messages
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingHistory || !hasMoreHistory || !conversationId) return;

    setIsLoadingHistory(true);
    try {
      const firstMessage = messages[0];
      if (!firstMessage) return;

      const res = await fetch(
        `/api/conversations/${conversationId}/messages?limit=20&before=${firstMessage.id}`
      );
      if (!res.ok) throw new Error("Failed to load more");
      const data: HistoryResponse = await res.json();

      if (data.messages.length > 0) {
        const olderMessages: ChatMessage[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages((prev) => [...olderMessages, ...prev]);
      }
      setHasMoreHistory(data.hasMore);
    } catch (err) {
      console.error("Failed to load more messages", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [messages, isLoadingHistory, hasMoreHistory, conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantId = `assistant-${Date.now()}`;
      assistantIdRef.current = assistantId;

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      setIsStreaming(true);
      setIsWaking(false);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const fetchLoop = async () => {
        try {
          // Use the real backend API URL from env
          const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

          const res = await fetch(`${apiUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content.trim(),
              conversationId: conversationId || undefined,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const error = await res.json().catch(() => ({}));

            if (error.error === "NO_CREDITS") {
              setShowAddCreditsModal(true);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: "You have run out of credits." }
                    : m
                )
              );
              setIsStreaming(false);
              return;
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                    ...m,
                    content: `${error.message || "Something went wrong."}`,
                  }
                  : m
              )
            );
            setIsStreaming(false);
            return;
          }

          setIsWaking(false);

          // Handle JSON response (Real Backend)
          const data = await res.json();

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: data.message }
                : m
            )
          );

          if (data.status === "QUEUED") {
            // If a job was started, we could optionally poll for updates here
            // For now, just show the confirmation message
          }

          setIsStreaming(false);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Stream error", err);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                    ...m,
                    content: "Connection lost. Please try again.",
                  }
                  : m
              )
            );
            setIsStreaming(false);
            setIsWaking(false);
          }
        }
      };

      fetchLoop();
    },
    [conversationId]
  );

  return {
    messages,
    isStreaming,
    isWaking,
    isLoadingHistory,
    hasMoreHistory,
    showAddCreditsModal,
    setShowAddCreditsModal,
    lastUsage,
    sendMessage,
    loadMoreHistory,
  };
}
