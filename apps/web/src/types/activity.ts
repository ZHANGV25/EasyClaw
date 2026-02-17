export interface AgentStep {
  id: string;
  label: string;
  status: "done" | "running" | "pending" | "error";
  durationMs?: number;
  detail?: string;
}
