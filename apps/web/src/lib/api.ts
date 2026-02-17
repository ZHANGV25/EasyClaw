/**
 * API client wrapper.
 * When the real backend is ready, swap BASE_URL to the production API.
 * Auth tokens will be attached automatically via Clerk's middleware.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

interface FetchOptions extends RequestInit {
  json?: unknown;
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    ...customHeaders,
  };

  if (json) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
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

// Convenience methods
export const apiGet = <T>(path: string) => api<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", json: body });
export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
