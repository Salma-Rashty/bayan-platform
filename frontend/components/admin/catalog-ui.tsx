"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FilterTabs } from "@/components/admin/admin-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import { pluralize } from "@/lib/role-rules";
import type { Category, Level } from "@/lib/types";

export type TrashedFilter = "current" | "only" | "with";

export const TRASHED_OPTIONS: { value: TrashedFilter; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "only", label: "Deleted" },
  { value: "with", label: "All" },
];

export type ActiveFilter = "all" | "active" | "inactive";

/** Whether an item counts as active for filtering. Levels use the effective state (see Level). */
type IsActive<T> = (item: T) => boolean;

const ownActive = (item: { is_active: boolean }) => item.is_active;

export function matchesActive<T extends { is_active: boolean }>(
  item: T,
  filter: ActiveFilter,
  isActive: IsActive<T> = ownActive
): boolean {
  return filter === "all" ? true : filter === "active" ? isActive(item) : !isActive(item);
}

/** Filter tab options with counts, for a list already narrowed by search. */
export function activeFilterOptions<T extends { is_active: boolean }>(items: T[], isActive: IsActive<T> = ownActive) {
  const active = items.filter(isActive).length;
  return [
    { value: "all" as const, label: "All", count: items.length },
    { value: "active" as const, label: "Active", count: active },
    { value: "inactive" as const, label: "Inactive", count: items.length - active },
  ];
}

/**
 * The two catalog list filters: existence (Current/Deleted/All, sent to the API as `trashed`)
 * and status (All/Active/Inactive, applied to the loaded list). Status only applies to
 * current records, so switching existence away from Current resets it to All.
 */
export function useCatalogFilters() {
  const [trashed, setTrashedState] = useState<TrashedFilter>("current");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  function setTrashed(value: TrashedFilter) {
    setTrashedState(value);
    if (value !== "current") setActiveFilter("all");
  }

  return { trashed, setTrashed, activeFilter, setActiveFilter, statusApplies: trashed === "current" };
}

function FilterSegment({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 py-1 pr-1 pl-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** The existence and status filters as two labeled segments; Status is hidden unless showing current records. */
export function CatalogFilters({
  filters,
  noun,
  statusOptions,
}: {
  filters: ReturnType<typeof useCatalogFilters>;
  /** Plural, e.g. "categories". */
  noun: string;
  /** From activeFilterOptions(), for the counts. */
  statusOptions: ReturnType<typeof activeFilterOptions>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSegment label="Show:">
        <FilterTabs
          label={`Show current or deleted ${noun}`}
          options={TRASHED_OPTIONS}
          value={filters.trashed}
          onChange={filters.setTrashed}
        />
      </FilterSegment>
      {filters.statusApplies && (
        <FilterSegment label="Status:">
          <FilterTabs
            label={`Filter ${noun} by status`}
            options={statusOptions}
            value={filters.activeFilter}
            onChange={filters.setActiveFilter}
          />
        </FilterSegment>
      )}
    </div>
  );
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

  /** Flips is_active. Resolves to whether it saved (so a toggle can revert on failure). */
  async function toggleActive(item: T): Promise<boolean> {
    const nextValue = !item.is_active;
    let saved = false;
    await run(item, async () => {
      try {
        await api.put(`${basePath}/${item.id}`, { is_active: nextValue });
        toast.success(nextValue ? `Activated "${item.name}".` : `Deactivated "${item.name}".`);
        saved = true;
        onChanged();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Could not update this ${noun}.`);
      }
    });
    return saved;
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

/**
 * Active/inactive slide toggle (green on, red off) that asks before saving. Flipping it
 * moves the switch and opens a confirmation; Cancel (or closing the dialog) moves it back
 * without an API call, and a failed save moves it back too.
 */
export function ActiveSwitch<T extends CatalogItem>({
  item,
  noun,
  busy,
  onConfirm,
  note,
}: {
  item: T;
  noun: "category" | "level";
  busy?: boolean;
  /** Saves the flipped state; resolves to whether it succeeded. */
  onConfirm: (item: T) => Promise<boolean>;
  /** Appended to the dialog's description, e.g. what the change does or doesn't affect. */
  note?: (activating: boolean) => string;
}) {
  // The state shown while confirming/saving, before the refetched item catches up.
  const [pending, setPending] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Once the item reflects a change, drop the local override (React's "adjusting state
  // when a prop changes" pattern, as in useApiGet).
  const [trackedActive, setTrackedActive] = useState(item.is_active);
  if (trackedActive !== item.is_active) {
    setTrackedActive(item.is_active);
    setPending(null);
  }

  const checked = pending ?? item.is_active;
  const activating = !item.is_active;

  function cancel() {
    setOpen(false);
    setPending(null);
  }

  async function confirm() {
    setSaving(true);
    const saved = await onConfirm(item);
    setSaving(false);
    setOpen(false);
    if (!saved) setPending(null);
  }

  return (
    <>
      <label className="inline-flex items-center gap-2 text-sm">
        <Switch
          checked={checked}
          disabled={busy || saving}
          onCheckedChange={(next) => {
            setPending(next);
            setOpen(true);
          }}
          aria-label={`${item.is_active ? "Deactivate" : "Activate"} ${item.name}`}
          className="data-checked:bg-emerald-500 data-unchecked:bg-red-500 dark:data-checked:bg-emerald-500 dark:data-unchecked:bg-red-500 [&>[data-slot=switch-thumb]]:bg-white!"
        />
        <span
          className={
            checked ? "font-medium text-emerald-700 dark:text-emerald-400" : "font-medium text-red-700 dark:text-red-400"
          }
        >
          {checked ? "Active" : "Inactive"}
        </span>
      </label>
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !saving) cancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activating ? "Activate" : "Deactivate"} this {noun}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{item.name}&rdquo; will be marked {activating ? "active" : "inactive"}.
              {note && <> {note(activating)}</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} onClick={cancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant={activating ? "default" : "destructive"} disabled={saving} onClick={confirm}>
              {saving ? "Saving..." : activating ? "Activate" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Confirmation note for a category's switch. Levels keep their own state; the category
 * only gates them (see Level::isEffectivelyActive on the API).
 */
export function categoryToggleNote(activating: boolean): string {
  return activating
    ? "Its levels go back to their own saved status."
    : "Its levels will be hidden while the category is inactive.";
}

/**
 * Why a level whose own switch is on still isn't active, or null if nothing blocks it.
 */
export function levelBlockedReason(level: Level): string | null {
  if (level.deleted_at || !level.is_active || level.is_effectively_active) return null;
  return level.category?.deleted_at ? "Inactive – category deleted" : "Inactive – category off";
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
