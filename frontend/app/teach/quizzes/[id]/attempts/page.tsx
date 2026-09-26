"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { PaginationControls } from "@/components/pagination-controls";
import { Protected } from "@/components/protected";
import { BackToCourse } from "@/components/teach/back-to-course";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import { STAFF_ROLES, type Paginated, type Quiz, type QuizAttempt } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

function AttemptsTable({ quizId }: { quizId: number }) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<Paginated<QuizAttempt>>(
    `/quizzes/${quizId}/attempts?page=${page}`
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load quiz attempts</AlertTitle>
        <AlertDescription>
          {error}{" "}
          <button type="button" onClick={reload} className="underline underline-offset-4">
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const attempts = data?.data ?? [];

  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No students have taken this quiz yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{attempt.user?.name ?? `Student #${attempt.user_id}`}</p>
                  {attempt.user?.email && <p className="text-xs text-muted-foreground">{attempt.user.email}</p>}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {attempt.score !== null ? `${formatNumber(attempt.score)}%` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(attempt.submitted_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {data && <PaginationControls meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}

function QuizAttempts() {
  const params = useParams<{ id: string }>();
  const { data: quiz, loading, error } = useApiGet<Quiz>(`/quizzes/${params.id}`);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this quiz</AlertTitle>
        <AlertDescription>{error ?? "This quiz could not be found."}</AlertDescription>
      </Alert>
    );
  }

  const questionCount = quiz.questions?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackToCourse lessonId={quiz.lesson_id} />
        <h1 className="text-2xl font-semibold">{quiz.title}</h1>
        <p className="text-sm text-muted-foreground">
          {questionCount} {questionCount === 1 ? "question" : "questions"} &middot; Scores are the percentage of
          questions answered correctly.
        </p>
        {quiz.description && <p className="text-sm text-foreground">{quiz.description}</p>}
      </div>
      <AttemptsTable quizId={quiz.id} />
    </div>
  );
}

export default function QuizAttemptsPage() {
  return (
    <Protected roles={STAFF_ROLES}>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <QuizAttempts />
      </div>
    </Protected>
  );
}
