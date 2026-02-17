export type AgentStepType = "thought" | "tool-call" | "terminal" | "file-write";

export interface AgentStep {
  id: string;
  type: AgentStepType;
  label: string;
  content?: string; // For thoughts or details
  status: "done" | "running" | "pending" | "error";
  durationMs?: number;
  args?: Record<string, any>; // For tool calls
  output?: string; // For tool/terminal output
}
