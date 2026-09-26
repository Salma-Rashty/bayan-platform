"use client";

import { useState } from "react";
import Link from "next/link";

import { PaginationControls } from "@/components/pagination-controls";
import { Protected } from "@/components/protected";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { STAFF_ROLES, type Course, type Paginated } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

// TODO(api): the API has no endpoint for a teacher's own `taughtCourses` — GET /courses
// returns every course (published or not) to staff. Once something like GET /my/teaching
// exists, point this at it so teachers only see the courses they're assigned to.
const TEACH_COURSES_PATH = "/courses";

function CourseCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

function PermissionSummary() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("edit-curriculum");
  const canGrade = hasPermission("grade-homework");

  return (
    <p className="text-sm text-muted-foreground">
      {canEdit ? "You can edit curriculum" : "You have read-only access to curriculum"}
      {" and "}
      {canGrade ? "grade homework." : "cannot grade homework."}
    </p>
  );
}

function TeachCourses() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<Paginated<Course>>(`${TEACH_COURSES_PATH}?page=${page}`);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CourseCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load your courses</AlertTitle>
        <AlertDescription>
          {error}{" "}
          <button type="button" onClick={reload} className="underline underline-offset-4">
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const courses = data?.data ?? [];

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium text-foreground">You&apos;re not assigned to any courses yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once an administrator assigns you to a course, it will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={`/teach/courses/${course.id}`} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{course.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {course.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                {course.level && <p>Level: {course.level}</p>}
                {course.starts_at && <p>Starts {formatDate(course.starts_at)}</p>}
                {!course.is_published && (
                  <Badge variant="outline" className="mt-1">
                    Draft
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {data && <PaginationControls meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}

export default function TeachPage() {
  return (
    <Protected roles={STAFF_ROLES}>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Teach</h1>
          <PermissionSummary />
        </div>
        <TeachCourses />
      </div>
    </Protected>
  );
}
