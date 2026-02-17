"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface UsageData {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

interface UseStreamChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isWaking: boolean;
  showAddCreditsModal: boolean;
  setShowAddCreditsModal: (show: boolean) => void;
  lastUsage: UsageData | null;
  sendMessage: (content: string) => Promise<void>;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! 👋 I'm your EasyClaw assistant. I can help you with research, reminders, writing, and everyday tasks. What can I help you with?",
  timestamp: new Date(),
};

export function useStreamChat(): UseStreamChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [lastUsage, setLastUsage] = useState<UsageData | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
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
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);
    
    setIsStreaming(true);
    setIsWaking(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchLoop = async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content.trim() }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          
          if (error.error === "NO_CREDITS") {
            setShowAddCreditsModal(true);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "⚠️ You have run out of credits." }
                  : m
              )
            );
            setIsStreaming(false);
            return;
          }

          if (error.error === "CONTAINER_STARTING") {
            setIsWaking(true);
            // Poll after 2 seconds
            setTimeout(fetchLoop, 2000);
            return;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `⚠️ ${error.message || "Something went wrong."}` }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        // Successfully connected, no longer waking
        setIsWaking(false);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            
            const jsonStr = line.replace(/^data: /, "");
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.content }
                      : m
                  )
                );
              } else if (event.type === "done") {
                setLastUsage(event.usage);
              }
            } catch (e) {
              console.warn("Failed to parse SSE event", e);
            }
          }
        }
        
        setIsStreaming(false);

      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Stream error", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "⚠️ Connection lost. Please try again." }
                : m
            )
          );
          setIsStreaming(false);
          setIsWaking(false);
        }
      }
    };

    fetchLoop();
  }, []);

  return { 
    messages, 
    isStreaming, 
    isWaking, 
    showAddCreditsModal, 
    setShowAddCreditsModal, 
    lastUsage, 
    sendMessage 
  };
}
