"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckIcon, LockIcon } from "lucide-react";

import { Protected } from "@/components/protected";
import { ApplicationStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime } from "@/lib/format";
import { AGE_GROUP_LABELS, GENDER_LABELS } from "@/lib/teacher-application-form";
import type { AgeGroup, MyTeacherApplications, TeacherApplication, TeacherApplicationStatus } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

const STAGES = ["Submitted", "Review", "Interview", "Decision"];

const STAGE_INDEX: Record<TeacherApplicationStatus, number> = {
  pending: 0,
  reviewing: 1,
  interview: 2,
  accepted: 3,
  rejected: 3,
};

const STATUS_NOTES: Record<TeacherApplicationStatus, string> = {
  pending: "We've received your application. It will be reviewed soon.",
  reviewing: "Our team is reviewing your application.",
  interview: "You've been shortlisted. We'll contact you by email to arrange an interview.",
  accepted: "Congratulations! Your application was accepted and your account now has teacher access.",
  rejected: "Thank you for applying. Unfortunately we can't offer you a teaching position this time.",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
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

function Progress({ status }: { status: TeacherApplicationStatus }) {
  const current = STAGE_INDEX[status];
  return (
    <ol className="flex items-center gap-2" aria-label="Application progress">
      {STAGES.map((stage, index) => {
        const done = index < current || (index === current && index === STAGES.length - 1);
        const label =
          index === STAGES.length - 1 && current === index
            ? status === "accepted"
              ? "Accepted"
              : "Not accepted"
            : stage;
        return (
          <li
            key={stage}
            className={`flex items-center gap-2 ${index < STAGES.length - 1 ? "flex-1" : ""}`}
            aria-current={index === current ? "step" : undefined}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                done
                  ? status === "rejected" && index === current
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                  : index === current
                    ? "border-2 border-primary text-primary"
                    : "border text-muted-foreground"
              }`}
            >
              {done ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={`text-xs ${index === current ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {index < STAGES.length - 1 && (
              <span aria-hidden className={`h-px flex-1 ${index < current ? "bg-primary" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ApplicationDetails({ application }: { application: TeacherApplication }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-2">
            <Row label="Name">{application.name}</Row>
            <Row label="Email">{application.email}</Row>
            <Row label="Phone">{application.phone_display ?? application.phone ?? "—"}</Row>
            <Row label="Nationality">{application.nationality_name}</Row>
            <Row label="Birth date">{formatDate(application.birth_date)}</Row>
            <Row label="Gender">{GENDER_LABELS[application.gender]}</Row>
            <Row label="CV">{application.files?.cv?.name ?? "—"}</Row>
            <Row label="Video">{application.files?.video?.name ?? "None"}</Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you can teach</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {application.selections?.map((selection, index) => (
              <li key={selection.category?.id ?? index} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-foreground">{selection.category?.name ?? "Unknown"}</p>
                {selection.levels.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-2">
                    {selection.levels.map((entry, levelIndex) => (
                      <li key={entry.level?.id ?? levelIndex} className="flex flex-wrap items-center gap-2 text-sm">
                        {entry.level?.name ?? "Unknown"}
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
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>About you</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-line text-foreground">{application.about}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MyApplication() {
  const { data, loading, error, reload } = useApiGet<MyTeacherApplications>("/my/teacher-applications");

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load your application</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {error}
          <Button size="sm" variant="outline" onClick={reload}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const [latest, ...earlier] = data.data;

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You haven&apos;t applied to teach yet</CardTitle>
          <CardDescription>Share your experience with us and we&apos;ll be in touch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/teach-with-us" />}>
            Apply to teach
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Application status</CardTitle>
              <CardDescription>Submitted {formatDateTime(latest.created_at)}</CardDescription>
            </div>
            <ApplicationStatusBadge status={latest.status} />
          </div>
          <Progress status={latest.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-foreground">{STATUS_NOTES[latest.status]}</p>
          {!data.can_apply && data.next_allowed_at ? (
            <p className="text-sm text-muted-foreground">
              You cannot apply again until{" "}
              <span className="font-medium text-foreground">{formatDate(data.next_allowed_at)}</span> (one application
              every {data.cooldown_months} months).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can apply again if you&apos;d like.{" "}
              <Link href="/teach-with-us" className="text-primary underline-offset-4 hover:underline">
                Start a new application
              </Link>
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon className="size-3.5" aria-hidden />
            Applications can&apos;t be edited after they&apos;re submitted, as our team may already be reviewing yours.
          </p>
        </CardContent>
      </Card>

      <ApplicationDetails application={latest} />

      {earlier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earlier applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {earlier.map((application) => (
                <li key={application.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-muted-foreground">Submitted {formatDate(application.created_at)}</span>
                  <ApplicationStatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MyTeacherApplicationPage() {
  return (
    <Protected>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="mb-6 text-2xl font-semibold">My teacher application</h1>
        <MyApplication />
      </div>
    </Protected>
  );
}
