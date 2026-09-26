"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  PageHeader,
  RequirePermission,
  TableSkeleton,
  TruncatedNotice,
} from "@/components/admin/admin-ui";
import { CourseDialog } from "@/components/admin/course-dialog";
import { RecentlyDeleted, useSessionTrash } from "@/components/admin/session-trash";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { Course } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type PublishFilter = "all" | "published" | "draft";

function CoursesManager() {
  const { items, setItems, total, truncated, loading, error, reload } = useAllPages<Course>("/courses");
  const [search, setSearch] = useState("");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [page, setPage] = useState(1);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const trash = useSessionTrash<Course>({
    basePath: "/courses",
    noun: "course",
    nameOf: (course) => course.title,
    onDeleted: (course) => setItems((current) => current?.filter((entry) => entry.id !== course.id) ?? null),
    onRestored: reload,
  });

  async function togglePublished(course: Course) {
    const nextValue = !course.is_published;
    setTogglingIds((current) => new Set(current).add(course.id));
    try {
      const updated = await api.put<Course>(`/courses/${course.id}`, { is_published: nextValue });
      setItems((current) => current?.map((entry) => (entry.id === course.id ? { ...entry, ...updated } : entry)) ?? null);
      toast.success(nextValue ? `Published "${course.title}".` : `Unpublished "${course.title}".`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this course.");
    } finally {
      setTogglingIds((current) => {
        const next = new Set(current);
        next.delete(course.id);
        return next;
      });
    }
  }

  const query = search.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (course) => !query || course.title.toLowerCase().includes(query) || course.slug.toLowerCase().includes(query)
  );
  const filtered = searched.filter((course) =>
    publishFilter === "all" ? true : publishFilter === "published" ? course.is_published : !course.is_published
  );
  const { pageItems, meta } = paginateLocally(filtered, page);
  const publishedCount = searched.filter((course) => course.is_published).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Courses"
        description="All courses, including drafts."
        actions={
          <CourseDialog
            trigger={
              <Button>
                <PlusIcon data-icon="inline-start" />
                New course
              </Button>
            }
            onSaved={reload}
          />
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search title or slug"
            aria-label="Search courses"
            className="pl-8"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <FilterTabs
          label="Filter by publish status"
          value={publishFilter}
          onChange={(value) => {
            setPublishFilter(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", count: searched.length },
            { value: "published", label: "Published", count: publishedCount },
            { value: "draft", label: "Draft", count: searched.length - publishedCount },
          ]}
        />
      </div>

      {truncated && items && <TruncatedNotice loaded={items.length} total={total} />}

      {loading && !items ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError title="Couldn't load courses" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>{items?.length ? "No courses match these filters." : "No courses yet. Create the first one."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.slug}
                        {course.level && <> &middot; {course.level}</>}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {course.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatPrice(course.price)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(course.starts_at) ?? "—"}</TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={course.is_published}
                          disabled={togglingIds.has(course.id)}
                          onCheckedChange={() => togglePublished(course)}
                          aria-label={`${course.is_published ? "Unpublish" : "Publish"} ${course.title}`}
                        />
                        <span className={course.is_published ? "text-foreground" : "text-muted-foreground"}>
                          {course.is_published ? "Live" : "Draft"}
                        </span>
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/teach/courses/${course.id}`} />}
                        >
                          <BookOpenIcon data-icon="inline-start" />
                          Lessons
                        </Button>
                        <CourseDialog
                          course={course}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${course.title}`}>
                              <PencilIcon />
                            </Button>
                          }
                          onSaved={reload}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${course.title}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2Icon />
                            </Button>
                          }
                          title="Delete course?"
                          description={
                            <>
                              &ldquo;{course.title}&rdquo; will be soft-deleted and hidden from students and teachers.
                              You can restore it afterwards.
                            </>
                          }
                          confirmLabel="Delete"
                          pendingLabel="Deleting..."
                          destructive
                          onConfirm={() => trash.remove(course)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <PaginationControls meta={meta} onPageChange={setPage} />
        </div>
      )}

      <RecentlyDeleted
        trash={trash}
        renderLabel={(course) => (
          <>
            <span className="font-medium text-foreground">{course.title}</span>{" "}
            <span className="text-muted-foreground">{course.slug}</span>
          </>
        )}
      />
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <RequirePermission permission="edit-curriculum">
      <CoursesManager />
    </RequirePermission>
  );
}
