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
import type { CourseApplicationStatus, TeacherApplication } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type StatusFilter = CourseApplicationStatus | "all";
const STATUSES: CourseApplicationStatus[] = ["pending", "reviewing", "accepted", "rejected"];

function TeacherApplicationsManager() {
  const { items, setItems, total, truncated, loading, error, reload } =
    useAllPages<TeacherApplication>("/teacher-applications");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [page, setPage] = useState(1);

  async function decide(application: TeacherApplication, decision: Decision): Promise<boolean> {
    try {
      const updated = await api.post<TeacherApplication>(`/teacher-applications/${application.id}/${decision}`);
      setItems((current) => current?.map((entry) => (entry.id === application.id ? updated : entry)) ?? null);
      toast.success(
        decision === "accept"
          ? `Accepted — ${application.name} now has the teacher role.`
          : `Rejected ${application.name}'s application.`
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
        description="Accepting creates (or restores) the applicant's account and grants the teacher role."
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
                  <TableHead>Qualifications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{application.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {application.email}
                        {application.phone && <> &middot; {application.phone}</>}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-64 whitespace-normal">
                      {application.qualifications ? (
                        <p className="line-clamp-2 text-muted-foreground" title={application.qualifications}>
                          {application.qualifications}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {application.cv_path && (
                        <a
                          href={application.cv_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                          View CV
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(application.created_at)}</TableCell>
                    <TableCell>
                      <DecisionActions
                        status={application.status}
                        subject={`${application.name}'s application`}
                        acceptDescription={
                          <>
                            {application.email} will get the teacher role. If no account exists for that email, one is
                            created with a random password and <strong>no email is sent</strong>, so they&apos;ll need
                            their password set before they can sign in.
                          </>
                        }
                        rejectDescription={
                          application.status === "accepted" ? (
                            <>
                              The application will be marked rejected. Their account and teacher role are{" "}
                              <strong>not</strong> removed — revoke the role from Users if needed.
                            </>
                          ) : (
                            <>The application will be marked rejected. The applicant is not notified automatically.</>
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

export default function AdminTeacherApplicationsPage() {
  return (
    <RequirePermission permission="manage-users">
      <TeacherApplicationsManager />
    </RequirePermission>
  );
}
