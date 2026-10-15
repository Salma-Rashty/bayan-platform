"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  PageHeader,
  RequirePermission,
  TableSkeleton,
  TruncatedNotice,
} from "@/components/admin/admin-ui";
import { TeacherApplicationActions } from "@/components/admin/teacher-application-actions";
import { PaginationControls } from "@/components/pagination-controls";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { TeacherApplication, TeacherApplicationStatus } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type StatusFilter = TeacherApplicationStatus | "all";
const STATUSES: TeacherApplicationStatus[] = ["pending", "reviewing", "interview", "accepted", "rejected"];

function TeacherApplicationsManager() {
  const { items, setItems, total, truncated, loading, error, reload } =
    useAllPages<TeacherApplication>("/teacher-applications");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);

  function replace(updated: TeacherApplication) {
    setItems((current) => current?.map((entry) => (entry.id === updated.id ? updated : entry)) ?? null);
  }

  const query = search.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (application) =>
      !query || application.name.toLowerCase().includes(query) || application.email.toLowerCase().includes(query)
  );
  const filtered =
    statusFilter === "all" ? searched : searched.filter((application) => application.status === statusFilter);
  const { pageItems, meta } = paginateLocally(filtered, page);

  const statusOptions = [
    ...STATUSES.map((status) => ({
      value: status as StatusFilter,
      label: status[0].toUpperCase() + status.slice(1),
      count: searched.filter((application) => application.status === status).length,
    })),
    { value: "all" as StatusFilter, label: "All", count: searched.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teacher applications"
        description="Applications move from pending to reviewing to interview, then accepted or rejected. Accepting creates (or restores) the applicant's account and grants the teacher role."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or email"
            aria-label="Search teacher applications"
            className="pl-8"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
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
        <LoadError title="Couldn't load teacher applications" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>
          {!items?.length
            ? "No teacher applications yet."
            : statusFilter === "pending" && !query
              ? "Nothing waiting for review."
              : "No applications match these filters."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Teaches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <Link
                        href={`/admin/teacher-applications/${application.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {application.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {application.email}
                        {application.phone && <> &middot; {application.phone_display ?? application.phone}</>}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                      {application.category_names?.length ? application.category_names.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(application.created_at)}</TableCell>
                    <TableCell>
                      <TeacherApplicationActions application={application} onChanged={replace} />
                    </TableCell>
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

export default function AdminTeacherApplicationsPage() {
  return (
    <RequirePermission permission="manage-users">
      <TeacherApplicationsManager />
    </RequirePermission>
  );
}
