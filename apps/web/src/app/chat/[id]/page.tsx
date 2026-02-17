"use client";

import { useEffect, use } from "react";
import { useConversations } from "@/contexts/ConversationsContext";
import ChatView from "@/components/ChatView";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { setActiveId } = useConversations();

  useEffect(() => {
    setActiveId(id);
    return () => setActiveId(null);
  }, [id, setActiveId]);

  return <ChatView conversationId={id} />;
}
