"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { Sidebar } from "@/components/Sidebar";
import { AddCreditsModal } from "@/components/AddCreditsModal";
import { ArtifactCard } from "@/components/ArtifactCard";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { BrowserViewer } from "@/components/BrowserViewer";
import { ActivityBlock } from "@/components/ActivityBlock"; // Import ActivityBlock
import { Artifact } from "@/types/artifacts";

interface ChatViewProps {
  conversationId?: string;
}

export default function ChatView({ conversationId }: ChatViewProps) {
  const {
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
    lastJobTriggered,
  } = useStreamChat(conversationId);

  const [input, setInput] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track credits (mock — starts at $1.00, deducts per message)
  const [credits, setCredits] = useState(1.0);

  const SUGGESTED_PROMPTS = [
    "Book a dinner reservation",
    "Set a reminder for tomorrow", 
    "Find flights to Miami",
    "Cancel my gym membership"
  ];

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    // Optional: auto-submit
    // sendMessage(prompt); 
  };

  useEffect(() => {
    if (lastUsage) {
      setCredits((prev) => Math.max(0, prev - lastUsage.costUsd));
    }
  }, [lastUsage]);

  // Auto-open browser panel when a COMPUTER_USE job is triggered
  useEffect(() => {
    if (lastJobTriggered) {
      setOpenArtifact(null);
      setIsBrowserOpen(true);
    }
  }, [lastJobTriggered]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleOpenArtifact = (artifactId: string) => {
    // Find artifact across all messages
    for (const msg of messages) {
      if (msg.artifact && msg.artifact.id === artifactId) {
        setOpenArtifact(msg.artifact);
        setIsBrowserOpen(false);
        return;
      }
    }
  };

  const handleClosePanel = () => {
    setOpenArtifact(null);
    setIsBrowserOpen(false);
  };

  const handleOpenBrowser = () => {
    setOpenArtifact(null);
    setIsBrowserOpen(true);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <AddCreditsModal
        isOpen={showAddCreditsModal}
        onClose={() => setShowAddCreditsModal(false)}
      />

      {/* Main content area: chat + optional artifact panel */}
      <div className="flex-1 flex min-w-0 relative">
        {/* Chat Area */}
        <div
          className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${openArtifact || isBrowserOpen ? "hidden lg:flex lg:w-[50%]" : "w-full"
            }`}
        >
          {/* Waking Up Overlay */}
          {isWaking && (
            <div className="absolute inset-x-0 top-16 z-20 flex justify-center animate-slide-up">
              <div className="bg-[var(--color-accent)]/10 backdrop-blur-md border border-[var(--color-accent)]/20 text-[var(--color-accent)] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-current rounded-full animate-ping" />
                <span className="text-xs font-semibold">Waking up assistant...</span>
              </div>
            </div>
          )}

          {/* Chat Header */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 glass-panel border-b-0 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-text-secondary)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div>
                <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  EasyClaw Assistant
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-[var(--color-warning)] animate-pulse" : "bg-[var(--color-success)]"}`} />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {isStreaming ? (isWaking ? "Waking..." : "Thinking...") : "Online"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Live Browser Toggle */}
               <button
                onClick={() => isBrowserOpen ? handleClosePanel() : handleOpenBrowser()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 ${
                  isBrowserOpen 
                    ? "bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-primary)]" 
                    : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isBrowserOpen ? "bg-red-500 animate-pulse" : "bg-current"}`} />
                {isBrowserOpen ? "Live View" : "Watch Live"}
              </button>

              <button
                onClick={() => setShowAddCreditsModal(true)}
                className="px-3 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              >
                ${credits.toFixed(2)}
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-32 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Load earlier messages */}
              {hasMoreHistory && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMoreHistory}
                    disabled={isLoadingHistory}
                    className="px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoadingHistory ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      "Load earlier messages"
                    )}
                  </button>
                </div>
              )}

              {/* History loading spinner (initial load) */}
              {isLoadingHistory && messages.length === 0 && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Empty State */}
              {!isLoadingHistory && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-6 shadow-sm">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--color-text-primary)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                     </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">What can I help with?</h2>
                  <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-8">
                    Type a message to get started. I can book appointments, set reminders, research anything, and more.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handlePromptClick(prompt)}
                        className="px-4 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, i) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                    } animate-fade-in`}
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] ${message.role === "user"
                      ? ""
                      : ""
                      }`}
                  >
                    {/* Activity Block */}
                    {message.role === "assistant" && message.activity && (
                      <ActivityBlock
                        steps={message.activity}
                        isStreaming={isStreaming && i === messages.length - 1}
                      />
                    )}

                    {/* Message Bubble - Hide if empty and streaming (let typing indicator show instead) */}
                    {(!isStreaming || message.content.trim() !== "" || message.role !== "assistant" || i !== messages.length - 1) && (
                      <div
                        className={`rounded-[22px] px-5 py-3.5 shadow-sm leading-snug text-[17px] font-normal antialiased ${message.role === "user"
                          ? "bg-[var(--color-bubble-user-bg)] text-[var(--color-bubble-user-text)] rounded-br-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                          : "bg-[var(--color-bubble-assistant-bg)] text-[var(--color-bubble-assistant-text)] rounded-bl-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                          }`}
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                          {isStreaming &&
                            !isWaking &&
                            message.role === "assistant" &&
                            i === messages.length - 1 && (
                              <span className="inline-block w-1.5 h-4 bg-[var(--color-text-primary)] ml-1 animate-pulse align-middle" />
                            )}
                        </div>
                        {!(isStreaming && message.role === "assistant" && i === messages.length - 1) && (
                          <span
                            className={`text-[10px] mt-1.5 block ${message.role === "user"
                              ? "text-[var(--color-bubble-user-text)] opacity-60"
                              : "text-[var(--color-text-muted)]"
                              }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Artifact Card — rendered below assistant message bubble */}
                    {message.artifact && message.role === "assistant" && (
                      <ArtifactCard
                        artifact={message.artifact}
                        onOpen={handleOpenArtifact}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isStreaming && !isWaking && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]"
                          style={{
                            animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-10 bg-gradient-to-t from-[var(--color-bg-gradient-stop)] to-transparent z-10">
            <form
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto flex items-end gap-3"
            >
              <div className="flex-1 relative shadow-2xl rounded-[26px]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full resize-none rounded-[26px] bg-[var(--color-surface)]/50 border border-[var(--color-border)] px-5 py-3.5 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:bg-[var(--color-surface)] focus:border-[var(--color-accent)]/20 backdrop-blur-xl transition-all duration-200 custom-scrollbar"
                  style={{ maxHeight: "150px" }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="p-3.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg flex-shrink-0 cursor-pointer"
              >
                {isStreaming ? (
                  <div className="w-5 h-5 border-2 border-[var(--color-text-primary)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                )}
              </button>
            </form>
            <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-2 max-w-2xl mx-auto">
              EasyClaw may produce inaccurate information.
            </p>
          </div>
        </div>

        {/* Artifact Panel — slides in from right */}
        {openArtifact && (
          <div className="w-full lg:w-[50%] shrink-0 animate-slide-in-right">
            <ArtifactPanel
              artifact={openArtifact}
              onClose={handleClosePanel}
            />
          </div>
        )}

        {/* Browser Panel */}
        {isBrowserOpen && (
          <div className="w-full lg:w-[50%] shrink-0 animate-slide-in-right h-full border-l border-[var(--color-border-subtle)] bg-[#1e1e1e]">
             <div className="h-full flex flex-col">
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-[#1e1e1e]">
                   <span className="text-sm font-medium text-white">Live Browser</span>
                   <button 
                     onClick={handleClosePanel}
                     className="p-1.5 text-white/50 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                   <BrowserViewer />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
