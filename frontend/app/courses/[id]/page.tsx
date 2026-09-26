"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Protected } from "@/components/protected";
import { ApplicationStatusBadge, EnrollmentStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Course, CourseApplication, Enrollment, Paginated } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function CourseDetail() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const courseQuery = useApiGet<Course>(`/courses/${courseId}`);
  const applicationsQuery = useApiGet<Paginated<CourseApplication>>("/my/applications");
  const enrollmentsQuery = useApiGet<Paginated<Enrollment>>("/my/enrollments");
  const [applying, setApplying] = useState(false);

  if (courseQuery.loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const course = courseQuery.data;

  if (courseQuery.error || !course) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this course</AlertTitle>
        <AlertDescription>{courseQuery.error ?? "This course could not be found."}</AlertDescription>
      </Alert>
    );
  }

  const statusLoading = applicationsQuery.loading || enrollmentsQuery.loading;
  const enrollment = enrollmentsQuery.data?.data.find((e) => e.course_id === course.id);
  const application = applicationsQuery.data?.data.find((a) => a.course_id === course.id);
  const isEnrolled = Boolean(enrollment);

  async function handleApply() {
    setApplying(true);
    try {
      await api.post(`/courses/${courseId}/apply`);
      toast.success("Application submitted!");
      applicationsQuery.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit your application.");
    } finally {
      setApplying(false);
    }
  }

  const now = new Date();
  const opensAt = course.registration_opens_at ? new Date(course.registration_opens_at) : null;
  const closesAt = course.registration_closes_at ? new Date(course.registration_closes_at) : null;
  const registrationClosed = Boolean(closesAt && now > closesAt);
  const registrationNotYetOpen = Boolean(opensAt && now < opensAt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <Badge variant="secondary" className="capitalize">
            {course.type}
          </Badge>
        </div>
        {course.level && <p className="text-sm text-muted-foreground">Level: {course.level}</p>}
      </div>

      {course.description && <p className="text-sm text-foreground">{course.description}</p>}

      {(course.registration_opens_at || course.registration_closes_at) && (
        <p className="text-sm text-muted-foreground">
          Registration
          {course.registration_opens_at && <> opens {formatDate(course.registration_opens_at)}</>}
          {course.registration_closes_at && <> and closes {formatDate(course.registration_closes_at)}</>}.
        </p>
      )}

      {statusLoading ? (
        <Skeleton className="h-9 w-32" />
      ) : isEnrolled && enrollment ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">You&apos;re enrolled:</span>
          <EnrollmentStatusBadge status={enrollment.status} />
        </div>
      ) : application ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your application:</span>
          <ApplicationStatusBadge status={application.status} />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Button
            onClick={handleApply}
            disabled={applying || registrationClosed || registrationNotYetOpen}
            className="w-fit"
          >
            {applying ? "Applying..." : "Apply"}
          </Button>
          {registrationClosed && (
            <p className="text-xs text-muted-foreground">Registration for this course has closed.</p>
          )}
          {registrationNotYetOpen && (
            <p className="text-xs text-muted-foreground">
              Registration opens {formatDate(course.registration_opens_at)}.
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
          <CardDescription>
            {isEnrolled ? "Click a lesson to view its content." : "Enroll in this course to access lesson content."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!course.lessons || course.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons have been added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {course.lessons.map((lesson) => (
                <li key={lesson.id} className="py-2">
                  {isEnrolled ? (
                    <Link
                      href={`/courses/${courseId}/lessons/${lesson.id}`}
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{lesson.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Protected>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <CourseDetail />
      </div>
    </Protected>
  );
}
