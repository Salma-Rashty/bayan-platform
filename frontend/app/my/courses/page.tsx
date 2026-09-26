"use client";

import Link from "next/link";

import { Protected } from "@/components/protected";
import { ApplicationStatusBadge, EnrollmentStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { CourseApplication, Enrollment, Paginated } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function EnrollmentsSection() {
  const { data, loading, error } = useApiGet<Paginated<Enrollment>>("/my/enrollments");

  if (loading) return <ListSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load your enrollments</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const enrollments = data?.data ?? [];

  if (enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground">You&apos;re not enrolled in any courses yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {enrollments.map((enrollment) => (
        <Link key={enrollment.id} href={`/courses/${enrollment.course_id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {enrollment.course?.title ?? `Course #${enrollment.course_id}`}
                </p>
                <p className="text-xs text-muted-foreground">Enrolled {formatDateTime(enrollment.enrolled_at)}</p>
              </div>
              <EnrollmentStatusBadge status={enrollment.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ApplicationsSection() {
  const { data, loading, error } = useApiGet<Paginated<CourseApplication>>("/my/applications");

  if (loading) return <ListSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load your applications</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const applications = data?.data ?? [];

  if (applications.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven&apos;t applied to any courses yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((application) => (
        <Link key={application.id} href={`/courses/${application.course_id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {application.course?.title ?? `Course #${application.course_id}`}
                </p>
                <p className="text-xs text-muted-foreground">Applied {formatDateTime(application.created_at)}</p>
              </div>
              <ApplicationStatusBadge status={application.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <Protected>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
        <div>
          <h1 className="mb-4 text-2xl font-semibold">My Courses</h1>
          <EnrollmentsSection />
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Applications</h2>
          <ApplicationsSection />
        </div>
      </div>
    </Protected>
  );
}
