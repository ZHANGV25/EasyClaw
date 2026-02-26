"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { IS_EXTERNAL } from "@/lib/api";

/**
 * Returns a helper that fetches a fresh Clerk JWT for API calls.
 * When the backend is local (mock routes), returns null.
 */
export function useAuthToken() {
  const { getToken } = useAuth();

  const fetchToken = useCallback(async (): Promise<string | undefined> => {
    if (!IS_EXTERNAL) return undefined;
    const token = await getToken();
    return token ?? undefined;
  }, [getToken]);

  return fetchToken;
}
