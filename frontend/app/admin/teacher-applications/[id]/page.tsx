"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { LoadError, RequirePermission } from "@/components/admin/admin-ui";
import { ApplicationFileActions } from "@/components/admin/application-file-viewer";
import { TeacherApplicationActions } from "@/components/admin/teacher-application-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { AGE_GROUP_LABELS, GENDER_LABELS } from "@/lib/teacher-application-form";
import type { AgeGroup, CatalogSummary, TeacherApplication, TeacherApplicationStatus } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

function CatalogName({ item }: { item: CatalogSummary | null }) {
  if (!item) return <span className="text-muted-foreground">Unknown</span>;
  return (
    <>
      {item.name}
      {item.deleted_at && <span className="text-xs text-muted-foreground"> (since deleted)</span>}
    </>
  );
}

function AgeGroups({ groups }: { groups: AgeGroup[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {groups.map((group) => (
        <Badge key={group} variant="secondary">
          {AGE_GROUP_LABELS[group]}
        </Badge>
      ))}
    </span>
  );
}

/** One distinct colour per status, so a past application's outcome reads at a glance. */
const HISTORY_STATUS_CLASSES: Record<TeacherApplicationStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  reviewing: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  interview: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

function HistoryStatusBadge({ status }: { status: TeacherApplicationStatus }) {
  return <Badge className={`capitalize ${HISTORY_STATUS_CLASSES[status]}`}>{status}</Badge>;
}

/**
 * Who the applicant is on the platform, whether they applied before (same account, or same
 * name + birth date from another account) and where their reapplication cooldown stands.
 */
function ApplicantHistoryCard({
  application,
  onChanged,
}: {
  application: TeacherApplication;
  onChanged: (updated: TeacherApplication) => void;
}) {
  const history = application.history;
  if (!history) return null;

  async function liftCooldown(): Promise<boolean> {
    try {
      onChanged(await api.post<TeacherApplication>(`/teacher-applications/${application.id}/lift-cooldown`));
      toast.success(`${application.name} can apply again now.`);
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't lift the cooldown.");
      return false;
    }
  }

  const submittedOnBehalf = application.submitted_by && application.submitted_by.id !== application.user?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applicant history</CardTitle>
        <CardDescription>
          Applications count as the same applicant when they share an account, or the same name and birth date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          <Row label="Account">
            {application.user ? (
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/users/${application.user.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {application.user.name}
                </Link>
                <span className="text-muted-foreground">{application.user.email}</span>
                {application.user.roles.map((role) => (
                  <Badge key={role} variant="outline" className="capitalize">
                    {role}
                  </Badge>
                ))}
                {application.user.deleted_at && <span className="text-xs text-muted-foreground">(deleted)</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Not linked to an account. Accepting creates (or restores) one for {application.email}.
              </span>
            )}
          </Row>
          {submittedOnBehalf && application.submitted_by && (
            <Row label="Submitted by">{application.submitted_by.name}, on the applicant&apos;s behalf</Row>
          )}
          <Row label="Reapplying">
            {history.next_allowed_at ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  Can apply again from <span className="font-medium">{formatDate(history.next_allowed_at)}</span>
                </span>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <RotateCcwIcon data-icon="inline-start" />
                      Allow reapply now
                    </Button>
                  }
                  title={`Let ${application.name} apply again now?`}
                  description={`This lifts the ${history.cooldown_months}-month wait for one new application. Once they apply again, a new cooldown starts from that application.`}
                  confirmLabel="Allow reapply"
                  pendingLabel="Saving..."
                  onConfirm={liftCooldown}
                />
              </span>
            ) : history.cooldown_lifted_at ? (
              <span>
                Can apply again now: cooldown lifted {formatDateTime(history.cooldown_lifted_at)}
                {history.cooldown_lifted_by && <> by {history.cooldown_lifted_by}</>}.
              </span>
            ) : (
              <span>Can apply again now.</span>
            )}
          </Row>
          <Row label="Other applications">
            {history.matches.length === 0 ? (
              <span className="text-muted-foreground">None: this is their first application.</span>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors hover:border-foreground/20 hover:bg-muted/60"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <HistoryStatusBadge status={match.status} />
                      <span className="text-sm font-medium text-foreground">
                        Submitted {formatDate(match.created_at)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/admin/teacher-applications/${match.id}`} />}
                    >
                      View
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
}

function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: application, setData, loading, error, reload } = useApiGet<TeacherApplication>(`/teacher-applications/${id}`);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/teacher-applications"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Teacher applications
      </Link>

      {loading && !application ? (
        <Skeleton className="h-96 w-full" />
      ) : error || !application ? (
        <LoadError title="Couldn't load this application" error={error ?? "Not found."} onRetry={reload} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{application.name}</h1>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Applied {formatDateTime(application.created_at)}</p>
            </div>
            <TeacherApplicationActions application={application} onChanged={setData} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Applicant</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-2">
                  <Row label="First name">{application.first_name}</Row>
                  <Row label="Surname">{application.last_name}</Row>
                  <Row label="Email">{application.email}</Row>
                  <Row label="Phone">{application.phone_display ?? <span className="text-muted-foreground">Not given</span>}</Row>
                  <Row label="Nationality">{application.nationality_name}</Row>
                  <Row label="Birth date">{formatDate(application.birth_date)}</Row>
                  <Row label="Gender">{GENDER_LABELS[application.gender]}</Row>
                  <Row label="CV">
                    <ApplicationFileActions applicationId={application.id} kind="cv" file={application.files?.cv ?? null} />
                  </Row>
                  <Row label="Video">
                    <ApplicationFileActions applicationId={application.id} kind="video" file={application.files?.video ?? null} />
                  </Row>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What they can teach</CardTitle>
                <CardDescription>Levels and age groups as chosen on the form.</CardDescription>
              </CardHeader>
              <CardContent>
                {application.selections?.length ? (
                  <ul className="flex flex-col gap-3">
                    {application.selections.map((selection, index) => (
                      <li key={selection.category?.id ?? index} className="rounded-lg border p-3">
                        <p className="text-sm font-medium text-foreground">
                          <CatalogName item={selection.category} />
                        </p>
                        {selection.levels.length > 0 ? (
                          <ul className="mt-2 flex flex-col gap-2">
                            {selection.levels.map((entry, levelIndex) => (
                              <li key={entry.level?.id ?? levelIndex} className="flex flex-wrap items-center gap-2 text-sm">
                                <CatalogName item={entry.level} />
                                <AgeGroups groups={entry.age_groups} />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-2">
                            <AgeGroups groups={selection.age_groups} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No selections recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About them</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line text-foreground">{application.about}</p>
            </CardContent>
          </Card>

          <ApplicantHistoryCard application={application} onChanged={setData} />
        </>
      )}
    </div>
  );
}

export default function AdminTeacherApplicationPage() {
  return (
    <RequirePermission permission="manage-users">
      <ApplicationDetail />
    </RequirePermission>
  );
}
