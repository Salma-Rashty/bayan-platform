"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ApplicationStatusBadge, EnrollmentStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { authHref } from "@/lib/auth-redirect";
import { formatDate } from "@/lib/format";
import type { Course, CourseApplication, Enrollment, Paginated } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function LessonsCard({ course, canOpen }: { course: Course; canOpen: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lessons</CardTitle>
        <CardDescription>
          {canOpen ? "Click a lesson to view its content." : "Enroll in this course to access lesson content."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!course.lessons || course.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons have been added yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {course.lessons.map((lesson) => (
              <li key={lesson.id} className="py-2">
                {canOpen ? (
                  <Link
                    href={`/courses/${course.id}/lessons/${lesson.id}`}
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
  );
}

/** Enrollment state, the Apply button and the lessons; only for signed-in users (it reads /my/*). */
function SignedInCourse({ course }: { course: Course }) {
  const applicationsQuery = useApiGet<Paginated<CourseApplication>>("/my/applications");
  const enrollmentsQuery = useApiGet<Paginated<Enrollment>>("/my/enrollments");

  const enrollment = enrollmentsQuery.data?.data.find((e) => e.course_id === course.id);
  const application = applicationsQuery.data?.data.find((a) => a.course_id === course.id);

  return (
    <>
      {applicationsQuery.loading || enrollmentsQuery.loading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <EnrollmentStatus
          course={course}
          enrollment={enrollment}
          application={application}
          onApplied={applicationsQuery.reload}
        />
      )}
      <LessonsCard course={course} canOpen={Boolean(enrollment)} />
    </>
  );
}

function EnrollmentStatus({
  course,
  enrollment,
  application,
  onApplied,
}: {
  course: Course;
  enrollment?: Enrollment;
  application?: CourseApplication;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    setApplying(true);
    try {
      await api.post(`/courses/${course.id}/apply`);
      toast.success("Application submitted!");
      onApplied();
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

  if (enrollment) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">You&apos;re enrolled:</span>
        <EnrollmentStatusBadge status={enrollment.status} />
      </div>
    );
  }

  if (application) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Your application:</span>
        <ApplicationStatusBadge status={application.status} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleApply}
        disabled={applying || registrationClosed || registrationNotYetOpen}
        className="w-fit"
      >
        {applying ? "Applying..." : "Apply"}
      </Button>
      {registrationClosed && <p className="text-xs text-muted-foreground">Registration for this course has closed.</p>}
      {registrationNotYetOpen && (
        <p className="text-xs text-muted-foreground">Registration opens {formatDate(course.registration_opens_at)}.</p>
      )}
    </div>
  );
}

/** For visitors: enrolling needs an account. */
function SignInToEnroll({ courseId }: { courseId: string }) {
  const next = `/courses/${courseId}`;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Log in or create a free account to enroll in this course.</p>
      <div className="flex gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href={authHref("/login", next)} />}>
          Log in
        </Button>
        <Button nativeButton={false} render={<Link href={authHref("/register", next)} />}>
          Sign up
        </Button>
      </div>
    </div>
  );
}

function CourseDetail() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { user, loading: authLoading } = useAuth();

  const courseQuery = useApiGet<Course>(`/courses/${courseId}`);

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

      {authLoading ? (
        <Skeleton className="h-9 w-32" />
      ) : user ? (
        <SignedInCourse course={course} />
      ) : (
        <>
          <SignInToEnroll courseId={courseId} />
          <LessonsCard course={course} canOpen={false} />
        </>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <CourseDetail />
    </div>
  );
}
