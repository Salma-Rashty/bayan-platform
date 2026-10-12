"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { pluralize } from "@/lib/role-rules";
import type { Category } from "@/lib/types";

export type TrashedFilter = "current" | "only" | "with";

export const TRASHED_OPTIONS: { value: TrashedFilter; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "only", label: "Deleted" },
  { value: "with", label: "All" },
];

export type ActiveFilter = "all" | "active" | "inactive";

export function matchesActive(item: { is_active: boolean }, filter: ActiveFilter): boolean {
  return filter === "all" ? true : filter === "active" ? item.is_active : !item.is_active;
}

/** Filter tab options with counts, for a list already narrowed by search. */
export function activeFilterOptions(items: { is_active: boolean }[]) {
  const active = items.filter((item) => item.is_active).length;
  return [
    { value: "all" as const, label: "All", count: items.length },
    { value: "active" as const, label: "Active", count: active },
    { value: "inactive" as const, label: "Inactive", count: items.length - active },
  ];
}

export function CatalogStatusBadge({ active, deleted }: { active: boolean; deleted?: boolean }) {
  if (deleted) return <Badge variant="destructive">Deleted</Badge>;
  return active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>;
}

/**
 * Why a category can't be deleted, mirroring CategoryController::destroy, or null if it can.
 * Only non-deleted levels block it.
 */
export function deleteCategoryBlocker(category: Category): string | null {
  return category.levels_count > 0
    ? `Has ${pluralize(category.levels_count, "level")}. Delete or move them to another category first.`
    : null;
}

interface CatalogItem {
  id: number;
  name: string;
  is_active: boolean;
}

/**
 * Activate/deactivate, soft-delete and restore for categories or levels. Every action
 * toasts its outcome and calls `onChanged` so the page can refetch.
 */
export function useCatalogActions<T extends CatalogItem>({
  basePath,
  noun,
  onChanged,
}: {
  /** e.g. `/levels` — PUT/DELETE `${basePath}/{id}`, PATCH `${basePath}/{id}/restore`. */
  basePath: string;
  noun: string;
  onChanged: () => void;
}) {
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  async function run(item: T, action: () => Promise<void>) {
    setBusyIds((current) => new Set(current).add(item.id));
    try {
      await action();
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function toggleActive(item: T) {
    const nextValue = !item.is_active;
    return run(item, async () => {
      try {
        await api.put(`${basePath}/${item.id}`, { is_active: nextValue });
        toast.success(nextValue ? `Activated "${item.name}".` : `Deactivated "${item.name}".`);
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Could not update this ${noun}.`);
      }
    });
  }

  function restore(item: T) {
    return run(item, async () => {
      try {
        await api.patch(`${basePath}/${item.id}/restore`);
        toast.success(`Restored ${noun} "${item.name}".`);
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Could not restore this ${noun}.`);
      }
    });
  }

  /** Soft-deletes the item. Resolves to false on failure (so a confirm dialog can stay open). */
  async function remove(item: T): Promise<boolean> {
    try {
      await api.delete(`${basePath}/${item.id}`);
      toast.success(`Deleted ${noun} "${item.name}".`, {
        action: { label: "Undo", onClick: () => void restore(item) },
      });
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not delete this ${noun}.`);
      return false;
    }
  }

  return { busyIds, toggleActive, remove, restore };
}

interface OrderedItem {
  id: number;
  name: string;
  order: number;
}

/**
 * The live siblings whose orders a category/level form must avoid (orders are unique among
 * live categories, and among a category's live levels). Fetches `path` only while it's
 * set, so a closed dialog doesn't load anything.
 */
export function useTakenOrders(path: string | null, excludeId?: number) {
  const [items, setItems] = useState<OrderedItem[] | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api
      .get<OrderedItem[]>(path)
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setLoadedPath(path);
        }
      })
      .catch(() => {
        // Only a hint: the API still rejects a taken order with a field error.
        if (!cancelled) setItems(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const taken = path && loadedPath === path ? (items ?? []).filter((item) => item.id !== excludeId) : null;
  const nextFree = taken ? Math.max(0, ...taken.map((item) => item.order)) + 1 : null;

  return {
    /** Siblings in order, or null while loading. */
    taken: taken ? [...taken].sort((a, b) => a.order - b.order) : null,
    /** What the API assigns when the order is left blank. */
    nextFree,
    ownerOf: (order: number) => taken?.find((item) => item.order === order) ?? null,
  };
}

/** Order field hint: what's taken, and a warning if the typed order clashes. */
export function OrderHint({
  value,
  takenOrders,
  scope,
}: {
  value: string;
  takenOrders: ReturnType<typeof useTakenOrders>;
  scope: string;
}) {
  const { taken, ownerOf } = takenOrders;
  if (!taken) return null;

  const owner = value.trim() !== "" ? ownerOf(Number(value)) : null;
  if (owner) {
    return (
      <p className="text-sm text-destructive">
        Order {value} is already used by &ldquo;{owner.name}&rdquo;{scope}.
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {taken.length === 0
        ? `No orders taken yet${scope}.`
        : `Taken${scope}: ${taken.map((item) => `${item.order} (${item.name})`).join(", ")}.`}
    </p>
  );
}

/** Appends `trashed` to a list path when the filter isn't the default. */
export function withTrashedParam(path: string, trashed: TrashedFilter): string {
  if (trashed === "current") return path;
  return `${path}${path.includes("?") ? "&" : "?"}trashed=${trashed}`;
}
