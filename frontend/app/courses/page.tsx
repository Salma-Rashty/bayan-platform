"use client";

import Link from "next/link";

import { Protected } from "@/components/protected";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import type { Course, Paginated } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function CourseCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

function CoursesGrid() {
  const { data, loading, error, reload } = useApiGet<Paginated<Course>>("/courses");

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CourseCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load courses</AlertTitle>
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
    return <p className="text-sm text-muted-foreground">No courses are available yet.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link key={course.id} href={`/courses/${course.id}`} className="block">
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
              <p>{formatPrice(course.price)}</p>
              {course.starts_at && <p>Starts {formatDate(course.starts_at)}</p>}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Protected>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="mb-6 text-2xl font-semibold">Courses</h1>
        <CoursesGrid />
      </div>
    </Protected>
  );
}
