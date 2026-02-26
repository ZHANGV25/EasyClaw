/**
 * API client wrapper — client-safe, no server imports.
 *
 * Usage:
 *   - Server components: use serverApi.ts (auto-injects Clerk token)
 *   - Client components: call api() directly; pass authToken if needed
 *
 * When NEXT_PUBLIC_API_URL is empty, requests hit local Next.js mock routes.
 * When NEXT_PUBLIC_API_URL is set, requests go to the AWS backend.
 */

export const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** True when the frontend is configured to talk to the real AWS backend */
export const IS_EXTERNAL = BASE_URL.length > 0;

interface FetchOptions extends RequestInit {
  json?: unknown;
  /** Optional Bearer token to forward to the real backend */
  authToken?: string;
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, authToken, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: json ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "UNKNOWN",
      message: "Something went wrong",
    }));
    throw new ApiError(response.status, error.error, error.message);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Convenience methods (no auth — use serverApi.ts for server-side auth)
export const apiGet = <T>(path: string, authToken?: string) =>
  api<T>(path, { method: "GET", authToken });
export const apiPost = <T>(path: string, body: unknown, authToken?: string) =>
  api<T>(path, { method: "POST", json: body, authToken });
export const apiPatch = <T>(path: string, body: unknown, authToken?: string) =>
  api<T>(path, { method: "PATCH", json: body, authToken });
export const apiDelete = <T>(path: string, authToken?: string) =>
  api<T>(path, { method: "DELETE", authToken });
