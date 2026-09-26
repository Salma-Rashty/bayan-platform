"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { api, ApiError } from "@/lib/api";
import type { Paginated } from "@/lib/types";

/** Safety cap: 40 pages × 15 rows = 600 records. */
const DEFAULT_MAX_PAGES = 40;

interface UseAllPagesResult<T> {
  items: T[] | null;
  /** Lets callers patch rows in place after a mutation, without refetching everything. */
  setItems: Dispatch<SetStateAction<T[] | null>>;
  /** Total reported by the API (may exceed items.length when `truncated`). */
  total: number;
  truncated: boolean;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  reload: () => void;
}

function pagePath(path: string, page: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}`;
}

/**
 * Loads every page of a paginated list endpoint so the admin tables can search, filter and
 * count across the whole dataset. The API's index endpoints take no filter/search params,
 * so this is the only way to get correct results; swap to server-side filtering once
 * they do.
 */
export function useAllPages<T extends { id: number }>(
  path: string,
  maxPages: number = DEFAULT_MAX_PAGES
): UseAllPagesResult<T> {
  const [items, setItems] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Same render-phase reset as useApiGet: a new request resets loading/error state.
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

    async function load() {
      const first = await api.get<Paginated<T>>(pagePath(path, 1));
      const lastPage = Math.min(first.meta.last_page, maxPages);
      const rest = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) => api.get<Paginated<T>>(pagePath(path, index + 2)))
      );

      // Rows can shift between pages if records change mid-fetch; de-duplicate by id.
      const seen = new Set<number>();
      const all = [first, ...rest]
        .flatMap((page) => page.data)
        .filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

      return { all, total: first.meta.total, truncated: first.meta.last_page > maxPages };
    }

    load()
      .then((result) => {
        if (cancelled) return;
        setItems(result.all);
        setTotal(result.total);
        setTruncated(result.truncated);
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
  }, [path, reloadKey, maxPages]);

  return { items, setItems, total, truncated, loading, error, errorStatus, reload };
}

/** Slices an already-filtered list into pages, shaped like Laravel's meta for PaginationControls. */
export function paginateLocally<T>(items: T[], page: number, perPage = 15) {
  const lastPage = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const start = (currentPage - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const meta: Paginated<T>["meta"] = {
    current_page: currentPage,
    last_page: lastPage,
    per_page: perPage,
    total: items.length,
    from: pageItems.length ? start + 1 : null,
    to: pageItems.length ? start + pageItems.length : null,
    path: "",
  };

  return { pageItems, meta };
}
