"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { PaginationControls } from "@/components/pagination-controls";
import { Protected } from "@/components/protected";
import { BackToCourse } from "@/components/teach/back-to-course";
import { GradeDialog } from "@/components/teach/grade-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatNumber } from "@/lib/format";
import { STAFF_ROLES, type Assignment, type Paginated, type Submission } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

type GradeFields = Pick<Submission, "grade" | "feedback" | "graded_at">;

function SubmissionsTable({ assignment }: { assignment: Assignment }) {
  const { hasPermission } = useAuth();
  const canGrade = hasPermission("grade-homework");
  const maxGrade = Number(assignment.max_grade);

  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<Paginated<Submission>>(
    `/assignments/${assignment.id}/submissions?page=${page}`
  );

  // Grades applied locally (optimistically, then confirmed by the server) on top of the fetched page.
  const [gradeOverrides, setGradeOverrides] = useState<Record<number, GradeFields>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  async function handleGrade(submission: Submission, grade: number, feedback: string | null) {
    const id = submission.id;
    const previous = gradeOverrides[id];
    const studentName = submission.user?.name ?? "this student";

    setGradeOverrides((current) => ({
      ...current,
      [id]: { grade: grade.toFixed(2), feedback, graded_at: new Date().toISOString() },
    }));
    setSavingIds((current) => new Set(current).add(id));

    try {
      // The response doesn't include `user`, so only the grade fields are taken from it.
      const updated = await api.post<Submission>(`/submissions/${id}/grade`, { grade, feedback });
      setGradeOverrides((current) => ({
        ...current,
        [id]: { grade: updated.grade, feedback: updated.feedback, graded_at: updated.graded_at },
      }));
      toast.success(`Saved grade for ${studentName}.`);
    } catch (err) {
      setGradeOverrides((current) => {
        const next = { ...current };
        if (previous) next[id] = previous;
        else delete next[id];
        return next;
      });
      toast.error(err instanceof ApiError ? err.message : `Could not save the grade for ${studentName}.`);
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load submissions</AlertTitle>
        <AlertDescription>
          {error}{" "}
          <button type="button" onClick={reload} className="underline underline-offset-4">
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  const submissions = (data?.data ?? []).map((submission) => ({ ...submission, ...gradeOverrides[submission.id] }));

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No students have submitted this assignment yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!canGrade && (
        <Alert>
          <AlertTitle>View only</AlertTitle>
          <AlertDescription>You need the grade-homework permission to grade submissions.</AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Grade</TableHead>
              {canGrade && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => {
              const saving = savingIds.has(submission.id);
              const isLate = Boolean(
                assignment.due_at && new Date(submission.submitted_at) > new Date(assignment.due_at)
              );

              return (
                <TableRow key={submission.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">
                      {submission.user?.name ?? `Student #${submission.user_id}`}
                    </p>
                    {submission.user?.email && (
                      <p className="text-xs text-muted-foreground">{submission.user.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col items-start gap-1">
                      {formatDateTime(submission.submitted_at)}
                      {isLate && <Badge variant="destructive">Late</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal">
                    {submission.content && (
                      <p className="line-clamp-2 text-foreground" title={submission.content}>
                        {submission.content}
                      </p>
                    )}
                    {submission.file_path && (
                      <a
                        href={submission.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        View file
                      </a>
                    )}
                    {!submission.content && !submission.file_path && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 whitespace-normal">
                    {submission.grade !== null ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {formatNumber(submission.grade)} / {formatNumber(maxGrade)}
                        </span>
                        {submission.feedback && (
                          <span className="line-clamp-2 text-xs text-muted-foreground" title={submission.feedback}>
                            {submission.feedback}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Ungraded</Badge>
                    )}
                  </TableCell>
                  {canGrade && (
                    <TableCell className="text-right">
                      <GradeDialog
                        submission={submission}
                        maxGrade={maxGrade}
                        onGrade={(grade, feedback) => handleGrade(submission, grade, feedback)}
                        trigger={
                          <Button size="sm" variant={submission.grade !== null ? "outline" : "default"} disabled={saving}>
                            {saving ? "Saving..." : submission.grade !== null ? "Regrade" : "Grade"}
                          </Button>
                        }
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {data && <PaginationControls meta={data.meta} onPageChange={setPage} />}
    </div>
  );
}

function AssignmentSubmissions() {
  const params = useParams<{ id: string }>();
  const { data: assignment, loading, error } = useApiGet<Assignment>(`/assignments/${params.id}`);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this assignment</AlertTitle>
        <AlertDescription>{error ?? "This assignment could not be found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackToCourse lessonId={assignment.lesson_id} />
        <h1 className="text-2xl font-semibold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">
          {assignment.due_at && <>Due {formatDateTime(assignment.due_at)} &middot; </>}
          Max grade: {formatNumber(assignment.max_grade)}
        </p>
        {assignment.description && <p className="text-sm text-foreground">{assignment.description}</p>}
      </div>
      <SubmissionsTable assignment={assignment} />
    </div>
  );
}

export default function AssignmentSubmissionsPage() {
  return (
    <Protected roles={STAFF_ROLES}>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <AssignmentSubmissions />
      </div>
    </Protected>
  );
}
