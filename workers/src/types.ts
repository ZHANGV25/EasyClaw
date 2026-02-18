export interface Job {
  id: string;
  user_id: string;
  conversation_id: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  type: string;
  input_payload: Record<string, any>;
  result_payload?: Record<string, any>;
  worker_id?: string;
  locked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  credits_balance: number;
  stripe_customer_id?: string;
  meta: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  state: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_usage: number;
  created_at: Date;
}

export interface StateSnapshot {
  id: string;
  job_id: string;
  s3_key: string;
  version: number;
  created_at: Date;
}

export interface JobContext {
  user: User;
  conversation: Conversation | null;
  messages: Message[];
  snapshotKey: string | null;
}

export interface JobResult {
  success: boolean;
  output?: any;
  error?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
}
