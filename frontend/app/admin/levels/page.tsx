"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  NativeSelect,
  PageHeader,
  RequirePermission,
  TableSkeleton,
} from "@/components/admin/admin-ui";
import {
  activeFilterOptions,
  matchesActive,
  TRASHED_OPTIONS,
  withTrashedParam,
  type ActiveFilter,
  type TrashedFilter,
} from "@/components/admin/catalog-ui";
import { LevelDialog } from "@/components/admin/level-dialog";
import { LevelsTable } from "@/components/admin/levels-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category, Level } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function LevelsManager() {
  const [trashed, setTrashed] = useState<TrashedFilter>("current");
  const [categoryId, setCategoryId] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [search, setSearch] = useState("");

  // Non-deleted categories: what a level can be created in or moved to.
  const categories = useApiGet<Category[]>("/categories");
  const levels = useApiGet<Level[]>(
    withTrashedParam(categoryId ? `/levels?category_id=${categoryId}` : "/levels", trashed)
  );

  const query = search.trim().toLowerCase();
  const searched = (levels.data ?? []).filter(
    (level) =>
      !query ||
      level.name.toLowerCase().includes(query) ||
      (level.description ?? "").toLowerCase().includes(query)
  );
  const filtered = searched.filter((level) => matchesActive(level, activeFilter));
  const categoryList = categories.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Levels"
        description="Every level across all categories."
        actions={
          categories.data && categoryList.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              <Link href="/admin/categories" className="underline underline-offset-4">
                Create a category
              </Link>{" "}
              before adding levels.
            </span>
          ) : (
            <LevelDialog
              categoryChoice={{
                kind: "select",
                categories: categoryList,
                defaultId: categoryId ? Number(categoryId) : undefined,
              }}
              trigger={
                <Button disabled={!categories.data}>
                  <PlusIcon data-icon="inline-start" />
                  New level
                </Button>
              }
              onSaved={levels.reload}
            />
          )
        }
      />

      {categories.error && (
        <LoadError title="Couldn't load categories" error={categories.error} onRetry={categories.reload} />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name or description"
              aria-label="Search levels"
              className="pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <FilterTabs label="Show deleted levels" options={TRASHED_OPTIONS} value={trashed} onChange={setTrashed} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect
            aria-label="Filter by category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">All categories</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active && " (inactive)"}
              </option>
            ))}
          </NativeSelect>
          <FilterTabs
            label="Filter by status"
            value={activeFilter}
            onChange={setActiveFilter}
            options={activeFilterOptions(searched)}
          />
        </div>
      </div>

      {levels.loading && !levels.data ? (
        <TableSkeleton />
      ) : levels.error ? (
        <LoadError title="Couldn't load levels" error={levels.error} onRetry={levels.reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>
          {levels.data?.length
            ? "No levels match these filters."
            : trashed === "only"
              ? "No deleted levels."
              : categoryId
                ? "This category has no levels yet."
                : "No levels yet. Create the first one."}
        </EmptyState>
      ) : (
        <LevelsTable
          levels={filtered}
          categories={{ kind: "select", categories: categoryList }}
          onChanged={levels.reload}
        />
      )}
    </div>
  );
}

export default function AdminLevelsPage() {
  return (
    <RequirePermission permission="manage-catalog">
      <LevelsManager />
    </RequirePermission>
  );
}
