"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon, PowerIcon, PowerOffIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  PageHeader,
  RequirePermission,
  TableSkeleton,
} from "@/components/admin/admin-ui";
import {
  activeFilterOptions,
  CatalogStatusBadge,
  deleteCategoryBlocker,
  matchesActive,
  TRASHED_OPTIONS,
  useCatalogActions,
  withTrashedParam,
  type ActiveFilter,
  type TrashedFilter,
} from "@/components/admin/catalog-ui";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pluralize } from "@/lib/role-rules";
import type { Category } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function CategoriesManager() {
  const [trashed, setTrashed] = useState<TrashedFilter>("current");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApiGet<Category[]>(withTrashedParam("/categories", trashed));
  const actions = useCatalogActions<Category>({ basePath: "/categories", noun: "category", onChanged: reload });

  const query = search.trim().toLowerCase();
  const searched = (data ?? []).filter(
    (category) =>
      !query ||
      category.name.toLowerCase().includes(query) ||
      (category.description ?? "").toLowerCase().includes(query)
  );
  const filtered = searched.filter((category) => matchesActive(category, activeFilter));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Top-level groupings of the catalog. Open a category to manage its levels."
        actions={
          <CategoryDialog
            trigger={
              <Button>
                <PlusIcon data-icon="inline-start" />
                New category
              </Button>
            }
            onSaved={reload}
          />
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or description"
            aria-label="Search categories"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs
            label="Filter by status"
            value={activeFilter}
            onChange={setActiveFilter}
            options={activeFilterOptions(searched)}
          />
          <FilterTabs label="Show deleted categories" options={TRASHED_OPTIONS} value={trashed} onChange={setTrashed} />
        </div>
      </div>

      {loading && !data ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError title="Couldn't load categories" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>
          {data?.length
            ? "No categories match these filters."
            : trashed === "only"
              ? "No deleted categories."
              : "No categories yet. Create the first one."}
        </EmptyState>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Levels</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((category) => {
                const deleted = Boolean(category.deleted_at);
                const busy = actions.busyIds.has(category.id);
                const blocker = deleteCategoryBlocker(category);

                return (
                  <TableRow key={category.id} className={deleted ? "text-muted-foreground" : undefined}>
                    <TableCell className="max-w-96 whitespace-normal">
                      <Link
                        href={`/admin/categories/${category.id}`}
                        className={deleted ? "font-medium hover:underline" : "font-medium text-foreground hover:underline"}
                      >
                        {category.name}
                      </Link>
                      {category.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{category.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pluralize(category.levels_count, "level")}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{category.order}</TableCell>
                    <TableCell>
                      <CatalogStatusBadge active={category.is_active} deleted={deleted} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {deleted ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => actions.restore(category)}>
                            <RotateCcwIcon data-icon="inline-start" />
                            {busy ? "Restoring..." : "Restore"}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={busy}
                              aria-label={`${category.is_active ? "Deactivate" : "Activate"} ${category.name}`}
                              title={category.is_active ? "Deactivate" : "Activate"}
                              onClick={() => actions.toggleActive(category)}
                            >
                              {category.is_active ? <PowerOffIcon /> : <PowerIcon />}
                            </Button>
                            <CategoryDialog
                              category={category}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${category.name}`} title="Edit">
                                  <PencilIcon />
                                </Button>
                              }
                              onSaved={reload}
                            />
                            {blocker ? (
                              // Disabled buttons swallow hover, so the explanation sits on a wrapper.
                              <span title={blocker} className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${category.name} (unavailable: ${blocker})`}
                                  disabled
                                >
                                  <Trash2Icon />
                                </Button>
                              </span>
                            ) : (
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Delete ${category.name}`}
                                    title="Delete"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2Icon />
                                  </Button>
                                }
                                title="Delete category?"
                                description={
                                  <>
                                    &ldquo;{category.name}&rdquo; will be soft-deleted. You can restore it from the Deleted
                                    filter.
                                  </>
                                }
                                confirmLabel="Delete"
                                pendingLabel="Deleting..."
                                destructive
                                onConfirm={() => actions.remove(category)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <RequirePermission permission="manage-catalog">
      <CategoriesManager />
    </RequirePermission>
  );
}
