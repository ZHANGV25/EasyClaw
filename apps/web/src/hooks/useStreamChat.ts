"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/contexts/ConversationsContext";
import { useAuthToken } from "@/hooks/useAuthToken";
import { BASE_URL, apiGet } from "@/lib/api";
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

export interface JobTriggered {
  jobId: string;
  type: string;
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
  lastJobTriggered: JobTriggered | null;
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
  const [lastJobTriggered, setLastJobTriggered] = useState<JobTriggered | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const loadedConvRef = useRef<string | null>(null);
  const router = useRouter();
  const { refreshConversations } = useConversations();
  const getToken = useAuthToken();

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
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${BASE_URL}/api/conversations/${conversationId}/messages?limit=50`,
          { headers }
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
  }, [conversationId, getToken]);

  // Load more (older) messages
  const loadMoreHistory = useCallback(async () => {
    if (isLoadingHistory || !hasMoreHistory || !conversationId) return;

    setIsLoadingHistory(true);
    try {
      const firstMessage = messages[0];
      if (!firstMessage) return;

      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${BASE_URL}/api/conversations/${conversationId}/messages?limit=20&before=${firstMessage.id}`,
        { headers }
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
  }, [messages, isLoadingHistory, hasMoreHistory, conversationId, getToken]);

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
          const token = await getToken();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${BASE_URL}/api/chat`, {
            method: "POST",
            headers,
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
                    content: `${error.error || error.message || "Something went wrong."}`,
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

          if (data.status === "QUEUED" && data.jobId) {
            setLastJobTriggered({ jobId: data.jobId, type: data.jobType || "COMPUTER_USE" });
          }

          // If this was a new conversation, the backend should return the ID
          if (!conversationId && data.conversationId) {
            // Update the URL without reloading the page
            window.history.replaceState(null, "", `/chat/${data.conversationId}`);
            // Refresh sidebar list
            refreshConversations();
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
    [conversationId, router, refreshConversations, getToken]
  );

  // Poll for job result when a job is triggered
  useEffect(() => {
    if (!lastJobTriggered) return;

    const { jobId } = lastJobTriggered;
    let cancelled = false;

    const poll = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const data = await apiGet<{
          id: string;
          status: string;
          result_payload?: { output?: any; error?: string; success?: boolean };
        }>(`/jobs/${jobId}`, token);

        if (cancelled) return;

        if (data.status === "COMPLETED" || data.status === "FAILED") {
          let content: string;
          if (data.status === "COMPLETED" && data.result_payload) {
            const output = data.result_payload.output;
            if (typeof output === "string") {
              content = output;
            } else if (output?.content) {
              content = output.content;
            } else if (output?.message?.content) {
              content = output.message.content;
            } else {
              content = JSON.stringify(output, null, 2);
            }
          } else if (data.status === "FAILED") {
            content = `Task failed: ${data.result_payload?.error || "Unknown error"}`;
          } else {
            content = "Task completed.";
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `job-result-${jobId}`,
              role: "assistant",
              content,
              timestamp: new Date(),
            },
          ]);
          setLastJobTriggered(null);
          return;
        }

        // Still running — poll again
        if (!cancelled) {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error("Job poll error:", err);
        if (!cancelled) {
          setTimeout(poll, 5000);
        }
      }
    };

    // Start polling after a short delay
    const timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lastJobTriggered, getToken]);

  return {
    messages,
    isStreaming,
    isWaking,
    isLoadingHistory,
    hasMoreHistory,
    showAddCreditsModal,
    setShowAddCreditsModal,
    lastUsage,
    lastJobTriggered,
    sendMessage,
    loadMoreHistory,
  };
}
