"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

interface SessionTrashOptions<T> {
  /** e.g. `/users` — DELETE `${basePath}/{id}` and PATCH `${basePath}/{id}/restore`. */
  basePath: string;
  noun: string;
  nameOf: (item: T) => string;
  onDeleted: (item: T) => void;
  onRestored: (item: T) => void;
}

/**
 * Soft-delete + restore for an admin list. The API's index endpoints can't list trashed
 * records, so items deleted during this visit are kept here to make Restore reachable.
 */
export function useSessionTrash<T extends { id: number }>({
  basePath,
  noun,
  nameOf,
  onDeleted,
  onRestored,
}: SessionTrashOptions<T>) {
  const [trashed, setTrashed] = useState<T[]>([]);
  const [restoringIds, setRestoringIds] = useState<Set<number>>(new Set());

  async function restore(item: T) {
    setRestoringIds((current) => new Set(current).add(item.id));
    try {
      const restored = await api.patch<T>(`${basePath}/${item.id}/restore`);
      setTrashed((current) => current.filter((entry) => entry.id !== item.id));
      toast.success(`Restored ${noun} "${nameOf(item)}".`);
      onRestored(restored);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not restore this ${noun}.`);
    } finally {
      setRestoringIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  /** Soft-deletes the item. Resolves to false on failure (so a confirm dialog can stay open). */
  async function remove(item: T): Promise<boolean> {
    try {
      await api.delete(`${basePath}/${item.id}`);
      setTrashed((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
      toast.success(`Deleted ${noun} "${nameOf(item)}".`, {
        action: { label: "Undo", onClick: () => void restore(item) },
      });
      onDeleted(item);
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not delete this ${noun}.`);
      return false;
    }
  }

  return { trashed, restoringIds, remove, restore };
}

interface RecentlyDeletedProps<T extends { id: number }> {
  trash: ReturnType<typeof useSessionTrash<T>>;
  renderLabel: (item: T) => ReactNode;
}

export function RecentlyDeleted<T extends { id: number }>({ trash, renderLabel }: RecentlyDeletedProps<T>) {
  if (trash.trashed.length === 0) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Deleted this session</CardTitle>
        <CardDescription>
          These were soft-deleted and can be restored. Items deleted earlier can&apos;t be listed here yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {trash.trashed.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 text-sm">{renderLabel(item)}</div>
              <Button
                size="sm"
                variant="outline"
                disabled={trash.restoringIds.has(item.id)}
                onClick={() => trash.restore(item)}
              >
                {trash.restoringIds.has(item.id) ? "Restoring..." : "Restore"}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
