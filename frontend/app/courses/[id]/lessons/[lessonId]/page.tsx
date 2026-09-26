"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { AssignmentCard } from "@/components/assignment-card";
import { Protected } from "@/components/protected";
import { QuizCard } from "@/components/quiz-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lesson } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function LessonContent() {
  const params = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();
  const { data: lesson, loading, error, errorStatus } = useApiGet<Lesson>(`/lessons/${params.lessonId}`);

  useEffect(() => {
    if (errorStatus === 403) {
      toast.error("You must be enrolled in this course to view this lesson.");
      router.replace(`/courses/${params.id}`);
    }
  }, [errorStatus, params.id, router]);

  if (loading || errorStatus === 403) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this lesson</AlertTitle>
        <AlertDescription>{error ?? "This lesson could not be found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        {lesson.description && <p className="mt-2 text-sm text-muted-foreground">{lesson.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {!lesson.materials || lesson.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No materials yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lesson.materials.map((material) => (
                <li key={material.id}>
                  <a
                    href={material.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {material.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        {!lesson.assignments || lesson.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          lesson.assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Quizzes</h2>
        {!lesson.quizzes || lesson.quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes yet.</p>
        ) : (
          lesson.quizzes.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} />)
        )}
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Protected>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <LessonContent />
      </div>
    </Protected>
  );
}
