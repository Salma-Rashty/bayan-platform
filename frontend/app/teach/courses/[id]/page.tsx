"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";

import { Protected } from "@/components/protected";
import { LessonDialog } from "@/components/teach/lesson-dialog";
import { LessonPanel } from "@/components/teach/lesson-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { STAFF_ROLES, type Course, type Lesson } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function LessonsSection({ courseId, canEdit }: { courseId: number; canEdit: boolean }) {
  // The nested lessons endpoint eager-loads materials, assignments and quizzes, which
  // GET /courses/{id} does not.
  const { data: lessons, loading, error, reload } = useApiGet<Lesson[]>(`/courses/${courseId}/lessons`);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Lessons</h2>
        {canEdit && (
          <LessonDialog
            courseId={courseId}
            trigger={
              <Button size="sm">
                <PlusIcon data-icon="inline-start" />
                New lesson
              </Button>
            }
            onSaved={reload}
          />
        )}
      </div>

      {/* Skeletons only on first load; after an edit, reload() keeps showing the stale list until it refreshes. */}
      {loading && !lessons ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load lessons</AlertTitle>
          <AlertDescription>
            {error}{" "}
            <button type="button" onClick={reload} className="underline underline-offset-4">
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : !lessons || lessons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {canEdit ? "No lessons yet. Create the first one to get started." : "No lessons have been added yet."}
          </CardContent>
        </Card>
      ) : (
        lessons.map((lesson) => <LessonPanel key={lesson.id} lesson={lesson} canEdit={canEdit} onChanged={reload} />)
      )}
    </section>
  );
}

function ManageCourse() {
  const params = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("edit-curriculum");
  const { data: course, loading, error } = useApiGet<Course>(`/courses/${params.id}`);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this course</AlertTitle>
        <AlertDescription>{error ?? "This course could not be found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/teach"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All courses
        </Link>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <Badge variant="secondary" className="capitalize">
            {course.type}
          </Badge>
          {!course.is_published && <Badge variant="outline">Draft</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {[course.level && `Level: ${course.level}`, course.starts_at && `Starts ${formatDate(course.starts_at)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {course.description && <p className="text-sm text-foreground">{course.description}</p>}

      {!canEdit && (
        <Alert>
          <AlertTitle>Read-only curriculum</AlertTitle>
          <AlertDescription>
            You can view lessons and review student work, but editing lessons, materials, assignments and quizzes
            requires the edit-curriculum permission.
          </AlertDescription>
        </Alert>
      )}

      <LessonsSection courseId={course.id} canEdit={canEdit} />
    </div>
  );
}

export default function ManageCoursePage() {
  return (
    <Protected roles={STAFF_ROLES}>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <ManageCourse />
      </div>
    </Protected>
  );
}
