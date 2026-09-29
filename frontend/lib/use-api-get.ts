"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { api, ApiError } from "@/lib/api";

interface UseApiGetResult<T> {
  data: T | null;
  /** Lets callers apply a mutation's response in place, without refetching. */
  setData: Dispatch<SetStateAction<T | null>>;
  loading: boolean;
  error: string | null;
  /** HTTP status of the last error, if any (e.g. to special-case a 403). */
  errorStatus: number | null;
  reload: () => void;
}

/** Fetches `path` on mount and whenever it changes; call `reload()` to refetch in place. */
export function useApiGet<T>(path: string): UseApiGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // A new request (new path, or an explicit reload()) resets loading/error state.
  // Done during render (React's "adjusting state when a prop changes" pattern) rather
  // than in the effect below, since that's what's actually starting the new request.
  const requestKey = `${path}#${reloadKey}`;
  const [trackedKey, setTrackedKey] = useState(requestKey);
  if (trackedKey !== requestKey) {
    setTrackedKey(requestKey);
    setLoading(true);
    setError(null);
    setErrorStatus(null);
  }

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        setErrorStatus(err instanceof ApiError ? err.status : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  return { data, setData, loading, error, errorStatus, reload };
}
