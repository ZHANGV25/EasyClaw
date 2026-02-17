export interface ArtifactFile {
  name: string;
  content: string;
}

export interface Artifact {
  id: string;
  conversationId: string;
  title: string;
  type: "app" | "script" | "document" | "image";
  language?: string;
  files: ArtifactFile[];
  previewUrl?: string;
  status: "generating" | "ready" | "error";
  createdAt: string;
}
