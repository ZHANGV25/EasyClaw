/**
 * Server-side API client — SERVER COMPONENT USE ONLY.
 * Automatically injects the Clerk JWT into every request.
 *
 * Import this in Server Components / Route Handlers that call the real backend.
 * Do NOT import in Client Components (use api.ts instead).
 */

import { auth } from "@clerk/nextjs/server";
import { api, BASE_URL } from "./api";

const IS_EXTERNAL = BASE_URL.length > 0;

async function getAuthToken(): Promise<string | null> {
  if (!IS_EXTERNAL) return null;
  try {
    const { getToken } = await auth();
    return await getToken();
  } catch {
    return null;
  }
}

export async function serverApiGet<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  return api<T>(path, { method: "GET", authToken: token ?? undefined });
}

export async function serverApiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
  return api<T>(path, { method: "POST", json: body, authToken: token ?? undefined });
}

export async function serverApiDelete<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  return api<T>(path, { method: "DELETE", authToken: token ?? undefined });
}
