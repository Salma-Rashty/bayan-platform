"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  NativeSelect,
  PageHeader,
  RequirePermission,
  TableSkeleton,
  TruncatedNotice,
} from "@/components/admin/admin-ui";
import { PaginationControls } from "@/components/pagination-controls";
import { EnrollmentStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { Enrollment, EnrollmentStatus } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type StatusFilter = EnrollmentStatus | "all";
const STATUSES: EnrollmentStatus[] = ["active", "completed", "cancelled"];

const studentName = (enrollment: Enrollment) => enrollment.user?.name ?? `Student #${enrollment.user_id}`;
const courseTitle = (enrollment: Enrollment) => enrollment.course?.title ?? `Course #${enrollment.course_id}`;

function EnrollmentsList() {
  const { items, total, truncated, loading, error, reload } = useAllPages<Enrollment>("/enrollments");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Course options come from the enrollments themselves, so every option has results.
  const courseOptions = Array.from(
    new Map((items ?? []).map((enrollment) => [enrollment.course_id, courseTitle(enrollment)])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const query = search.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (enrollment) =>
      (courseFilter === "all" || String(enrollment.course_id) === courseFilter) &&
      (!query ||
        studentName(enrollment).toLowerCase().includes(query) ||
        (enrollment.user?.email ?? "").toLowerCase().includes(query))
  );
  const filtered =
    statusFilter === "all" ? searched : searched.filter((enrollment) => enrollment.status === statusFilter);
  const { pageItems, meta } = paginateLocally(filtered, page);

  const statusOptions = [
    { value: "all" as StatusFilter, label: "All", count: searched.length },
    ...STATUSES.map((status) => ({
      value: status as StatusFilter,
      label: status[0].toUpperCase() + status.slice(1),
      count: searched.filter((enrollment) => enrollment.status === status).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Enrollments" description="Students are enrolled by accepting their course applications." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search student"
              aria-label="Search enrollments"
              className="pl-8"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <NativeSelect
            aria-label="Filter by course"
            className="sm:w-56"
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All courses</option>
            {courseOptions.map(([id, title]) => (
              <option key={id} value={String(id)}>
                {title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <FilterTabs
          label="Filter by status"
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
      </div>

      {truncated && items && <TruncatedNotice loaded={items.length} total={total} />}

      {loading && !items ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError title="Couldn't load enrollments" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>{items?.length ? "No enrollments match these filters." : "No enrollments yet."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{studentName(enrollment)}</p>
                      {enrollment.user?.email && (
                        <p className="text-xs text-muted-foreground">{enrollment.user.email}</p>
                      )}
                    </TableCell>
                    <TableCell>{courseTitle(enrollment)}</TableCell>
                    <TableCell>
                      <EnrollmentStatusBadge status={enrollment.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(enrollment.enrolled_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <PaginationControls meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default function AdminEnrollmentsPage() {
  return (
    <RequirePermission permission="manage-users">
      <EnrollmentsList />
    </RequirePermission>
  );
}
