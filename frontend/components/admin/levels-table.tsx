"use client";

import Link from "next/link";
import { PencilIcon, PowerIcon, PowerOffIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { CatalogStatusBadge, useCatalogActions } from "@/components/admin/catalog-ui";
import { LevelDialog } from "@/components/admin/level-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Category, Level } from "@/lib/types";

interface LevelsTableProps {
  levels: Level[];
  /**
   * Where edits pick the category from: the live category list (the Levels page, which
   * also shows a Category column), or one fixed category (that category's page).
   */
  categories: { kind: "select"; categories: Category[] } | { kind: "locked"; category: Pick<Category, "id" | "name"> };
  onChanged: () => void;
}

export function LevelsTable({ levels, categories, onChanged }: LevelsTableProps) {
  const actions = useCatalogActions<Level>({ basePath: "/levels", noun: "level", onChanged });
  const showCategory = categories.kind === "select";

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Level</TableHead>
            {showCategory && <TableHead>Category</TableHead>}
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {levels.map((level) => {
            const deleted = Boolean(level.deleted_at);
            const busy = actions.busyIds.has(level.id);
            const categoryDeleted = Boolean(level.category?.deleted_at);

            return (
              <TableRow key={level.id} className={deleted ? "text-muted-foreground" : undefined}>
                <TableCell className="max-w-80 whitespace-normal">
                  <p className={deleted ? "font-medium" : "font-medium text-foreground"}>{level.name}</p>
                  {level.description && <p className="line-clamp-1 text-xs text-muted-foreground">{level.description}</p>}
                </TableCell>
                {showCategory && (
                  <TableCell>
                    {level.category ? (
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/categories/${level.category.id}`} className="hover:underline">
                          {level.category.name}
                        </Link>
                        {categoryDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          !level.category.is_active && <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell className="tabular-nums text-muted-foreground">{level.order}</TableCell>
                <TableCell>
                  <CatalogStatusBadge active={level.is_active} deleted={deleted} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {deleted ? (
                      // Disabled buttons swallow hover, so the explanation sits on a wrapper.
                      <span title={categoryDeleted ? "Restore its category first." : undefined} className="inline-flex">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || categoryDeleted}
                          onClick={() => actions.restore(level)}
                        >
                          <RotateCcwIcon data-icon="inline-start" />
                          {busy ? "Restoring..." : "Restore"}
                        </Button>
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          aria-label={`${level.is_active ? "Deactivate" : "Activate"} ${level.name}`}
                          title={level.is_active ? "Deactivate" : "Activate"}
                          onClick={() => actions.toggleActive(level)}
                        >
                          {level.is_active ? <PowerOffIcon /> : <PowerIcon />}
                        </Button>
                        <LevelDialog
                          level={level}
                          categoryChoice={categories}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${level.name}`} title="Edit">
                              <PencilIcon />
                            </Button>
                          }
                          onSaved={onChanged}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${level.name}`}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2Icon />
                            </Button>
                          }
                          title="Delete level?"
                          description={
                            <>&ldquo;{level.name}&rdquo; will be soft-deleted. You can restore it from the Deleted filter.</>
                          }
                          confirmLabel="Delete"
                          pendingLabel="Deleting..."
                          destructive
                          onConfirm={() => actions.remove(level)}
                        />
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
  );
}
