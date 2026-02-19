export type MemoryCategory = "personal" | "health" | "travel" | "food" | "schedule" | "other";

export interface MemoryFact {
  id: string;
  category: MemoryCategory;
  fact: string;
  learnedAt: string;
  source?: {
    conversationId: string;
    messagePreview: string;
  };
}

export interface Learning {
  id: string;
  fact: string;
  category: MemoryCategory;
  learnedAt: string;
  status: "pending" | "confirmed" | "rejected";
  conversationId?: string;
}

export interface MemoryResponse {
  facts: MemoryFact[];
  recentLearnings: Learning[];
}
