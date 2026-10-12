"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { EmptyState, FilterTabs, LoadError, RequirePermission, TableSkeleton } from "@/components/admin/admin-ui";
import {
  CatalogStatusBadge,
  deleteCategoryBlocker,
  TRASHED_OPTIONS,
  useCatalogActions,
  withTrashedParam,
  type TrashedFilter,
} from "@/components/admin/catalog-ui";
import { CategoryDialog } from "@/components/admin/category-dialog";
import { LevelDialog } from "@/components/admin/level-dialog";
import { LevelsTable } from "@/components/admin/levels-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pluralize } from "@/lib/role-rules";
import type { Category, Level } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function CategoryActions({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const actions = useCatalogActions<Category>({ basePath: "/categories", noun: "category", onChanged });
  const busy = actions.busyIds.has(category.id);

  if (category.deleted_at) {
    return (
      <Button variant="outline" disabled={busy} onClick={() => actions.restore(category)}>
        <RotateCcwIcon data-icon="inline-start" />
        {busy ? "Restoring..." : "Restore category"}
      </Button>
    );
  }

  const blocker = deleteCategoryBlocker(category);

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button variant="outline" disabled={busy} onClick={() => actions.toggleActive(category)}>
        {category.is_active ? "Deactivate" : "Activate"}
      </Button>
      <CategoryDialog
        category={category}
        trigger={
          <Button variant="outline">
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        }
        onSaved={onChanged}
      />
      {blocker ? (
        <div className="flex flex-col items-end gap-1">
          <Button variant="destructive" disabled>
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
          <p className="max-w-56 text-right text-xs text-muted-foreground">{blocker}</p>
        </div>
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="destructive">
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          }
          title="Delete category?"
          description={<>&ldquo;{category.name}&rdquo; will be soft-deleted. You can restore it afterwards.</>}
          confirmLabel="Delete"
          pendingLabel="Deleting..."
          destructive
          onConfirm={() => actions.remove(category)}
        />
      )}
    </div>
  );
}

function CategoryLevels({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const [trashed, setTrashed] = useState<TrashedFilter>("current");
  const levels = useApiGet<Level[]>(withTrashedParam(`/categories/${category.id}/levels`, trashed));
  const categoryDeleted = Boolean(category.deleted_at);

  // Level changes also change the category's level count (and so whether it can be deleted).
  function handleChanged() {
    levels.reload();
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Levels</CardTitle>
        <CardDescription>Listed in order. Names are unique within this category.</CardDescription>
        {!categoryDeleted && (
          <CardAction>
            <LevelDialog
              categoryChoice={{ kind: "locked", category }}
              trigger={
                <Button>
                  <PlusIcon data-icon="inline-start" />
                  New level for this category
                </Button>
              }
              onSaved={handleChanged}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FilterTabs label="Show deleted levels" options={TRASHED_OPTIONS} value={trashed} onChange={setTrashed} />
        {levels.loading && !levels.data ? (
          <TableSkeleton rows={3} />
        ) : levels.error ? (
          <LoadError title="Couldn't load levels" error={levels.error} onRetry={levels.reload} />
        ) : !levels.data?.length ? (
          <EmptyState>
            {trashed === "only"
              ? "No deleted levels in this category."
              : categoryDeleted
                ? "This category has no levels."
                : "No levels yet. Add the first one."}
          </EmptyState>
        ) : (
          <LevelsTable levels={levels.data} categories={{ kind: "locked", category }} onChanged={handleChanged} />
        )}
      </CardContent>
    </Card>
  );
}

function CategoryDetail() {
  const params = useParams<{ id: string }>();
  const { data: category, loading, error, errorStatus, reload } = useApiGet<Category>(`/categories/${params.id}`);

  if (loading && !category) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (errorStatus === 404) {
    return <EmptyState>This category doesn&apos;t exist.</EmptyState>;
  }

  if (error || !category) {
    return <LoadError title="Couldn't load this category" error={error ?? "Something went wrong."} onRetry={reload} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{category.name}</h1>
            <CatalogStatusBadge active={category.is_active} deleted={Boolean(category.deleted_at)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(category.levels_count, "level")} &middot; Order {category.order}
          </p>
          {category.description && <p className="mt-3 max-w-2xl text-sm whitespace-pre-line">{category.description}</p>}
        </div>
        <CategoryActions category={category} onChanged={reload} />
      </div>

      {category.deleted_at && (
        <Alert>
          <AlertTitle>This category is deleted</AlertTitle>
          <AlertDescription>Restore it to add levels or restore its deleted levels.</AlertDescription>
        </Alert>
      )}

      <CategoryLevels category={category} onChanged={reload} />
    </div>
  );
}

export default function AdminCategoryPage() {
  return (
    <RequirePermission permission="manage-catalog">
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/categories"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All categories
        </Link>
        <CategoryDetail />
      </div>
    </RequirePermission>
  );
}
