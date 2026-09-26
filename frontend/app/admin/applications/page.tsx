"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
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
import { DecisionActions, type Decision } from "@/components/admin/decision-actions";
import { PaginationControls } from "@/components/pagination-controls";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { CourseApplication, CourseApplicationStatus } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type StatusFilter = CourseApplicationStatus | "all";
const STATUSES: CourseApplicationStatus[] = ["pending", "reviewing", "accepted", "rejected"];

const studentName = (application: CourseApplication) => application.user?.name ?? `Student #${application.user_id}`;
const courseTitle = (application: CourseApplication) => application.course?.title ?? `Course #${application.course_id}`;

function ApplicationsManager() {
  const { items, setItems, total, truncated, loading, error, reload } =
    useAllPages<CourseApplication>("/course-applications");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);

  async function decide(application: CourseApplication, decision: Decision): Promise<boolean> {
    try {
      const updated = await api.post<CourseApplication>(`/course-applications/${application.id}/${decision}`);
      // The response doesn't include `user`/`course`, so keep the ones already loaded.
      setItems(
        (current) =>
          current?.map((entry) =>
            entry.id === application.id ? { ...entry, status: updated.status, updated_at: updated.updated_at } : entry
          ) ?? null
      );
      toast.success(
        decision === "accept"
          ? `Accepted — ${studentName(application)} is now enrolled in ${courseTitle(application)}.`
          : `Rejected ${studentName(application)}'s application.`
      );
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not ${decision} this application.`);
      return false;
    }
  }

  const query = search.trim().toLowerCase();
  const searched = (items ?? []).filter(
    (application) =>
      !query ||
      studentName(application).toLowerCase().includes(query) ||
      (application.user?.email ?? "").toLowerCase().includes(query) ||
      courseTitle(application).toLowerCase().includes(query)
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
        title="Course applications"
        description="Accepting an application enrolls the student (or reactivates their enrollment)."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search student or course"
            aria-label="Search applications"
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
        <LoadError title="Couldn't load applications" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>
          {!items?.length
            ? "No course applications yet."
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
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{studentName(application)}</p>
                      {application.user?.email && (
                        <p className="text-xs text-muted-foreground">{application.user.email}</p>
                      )}
                    </TableCell>
                    <TableCell>{courseTitle(application)}</TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(application.created_at)}
                      {application.meeting_at && (
                        <p className="text-xs">Meeting {formatDateTime(application.meeting_at)}</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal">
                      {application.notes ? (
                        <p className="line-clamp-2 text-muted-foreground" title={application.notes}>
                          {application.notes}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DecisionActions
                        status={application.status}
                        subject={`${studentName(application)}'s application`}
                        acceptDescription={
                          <>
                            {studentName(application)} will be enrolled in {courseTitle(application)}. A previous
                            enrollment is reactivated rather than duplicated.
                          </>
                        }
                        rejectDescription={
                          application.status === "accepted" ? (
                            <>
                              The application will be marked rejected. Their existing enrollment in{" "}
                              {courseTitle(application)} is <strong>not</strong> removed.
                            </>
                          ) : (
                            <>The application will be marked rejected. The student is not notified automatically.</>
                          )
                        }
                        onDecide={(decision) => decide(application, decision)}
                      />
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

export default function AdminApplicationsPage() {
  return (
    <RequirePermission permission="manage-users">
      <ApplicationsManager />
    </RequirePermission>
  );
}
