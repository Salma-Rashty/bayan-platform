"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Assignment, Submission } from "@/lib/types";

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!content.trim() && !filePath.trim()) {
      setFieldError("Add some content or a file link before submitting.");
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const result = await api.post<Submission>(`/assignments/${assignment.id}/submit`, {
        content: content.trim() || undefined,
        file_path: filePath.trim() || undefined,
      });
      setSubmission(result);
      toast.success("Assignment submitted!");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fieldError("content") ?? err.fieldError("file_path") ?? err.message);
      } else {
        toast.error("Could not submit your assignment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{assignment.title}</CardTitle>
        {assignment.description && <CardDescription>{assignment.description}</CardDescription>}
        <p className="text-xs text-muted-foreground">
          {assignment.due_at && <>Due {formatDateTime(assignment.due_at)} &middot; </>}
          Max grade: {assignment.max_grade}
        </p>
      </CardHeader>
      <CardContent>
        {submission ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">Submitted {formatDateTime(submission.submitted_at)}</p>
            {submission.content && <p className="text-muted-foreground">{submission.content}</p>}
            {submission.file_path && (
              <a
                href={submission.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                View submitted file
              </a>
            )}
            <p className="text-muted-foreground">
              {submission.grade !== null ? `Grade: ${submission.grade}` : "Not graded yet."}
            </p>
            {submission.feedback && <p className="text-muted-foreground">Feedback: {submission.feedback}</p>}
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setSubmission(null)}>
              Submit again
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={!!fieldError || undefined}>
                <FieldLabel htmlFor={`content-${assignment.id}`}>Your answer</FieldLabel>
                <Textarea
                  id={`content-${assignment.id}`}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write your submission..."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`file-${assignment.id}`}>File link (optional)</FieldLabel>
                <Input
                  id={`file-${assignment.id}`}
                  value={filePath}
                  onChange={(event) => setFilePath(event.target.value)}
                  placeholder="https://..."
                />
              </Field>
              {fieldError && <FieldError>{fieldError}</FieldError>}
              <Button type="submit" disabled={submitting} className="w-fit">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
