"use client";

import { useState, type ReactElement } from "react";

import { FormDialog } from "@/components/teach/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Submission } from "@/lib/types";

interface GradeDialogProps {
  submission: Submission;
  maxGrade: number;
  trigger: ReactElement;
  /** Called once the input is valid; the caller applies the grade optimistically. */
  onGrade: (grade: number, feedback: string | null) => void;
}

export function GradeDialog({ submission, maxGrade, trigger, onGrade }: GradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [gradeError, setGradeError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setGrade(submission.grade !== null ? String(Number(submission.grade)) : "");
      setFeedback(submission.feedback ?? "");
      setGradeError(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit() {
    const value = Number(grade);
    if (grade.trim() === "" || Number.isNaN(value)) {
      setGradeError("Enter a grade.");
      return;
    }
    // The API only enforces min:0, so the upper bound is checked here.
    if (value < 0 || value > maxGrade) {
      setGradeError(`Grade must be between 0 and ${formatNumber(maxGrade)}.`);
      return;
    }

    setOpen(false);
    onGrade(value, feedback.trim() || null);
  }

  const studentName = submission.user?.name ?? `Student #${submission.user_id}`;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      submitting={false}
      trigger={trigger}
      title={`Grade ${studentName}`}
      description={`Submitted ${formatDateTime(submission.submitted_at)}`}
      onSubmit={handleSubmit}
      submitLabel="Save grade"
    >
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
        {submission.content ? (
          <p className="whitespace-pre-wrap text-foreground">{submission.content}</p>
        ) : (
          <p className="text-muted-foreground">No written answer.</p>
        )}
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
      </div>
      <Field data-invalid={!!gradeError || undefined}>
        <FieldLabel htmlFor="grade-value">Grade</FieldLabel>
        <Input
          id="grade-value"
          type="number"
          min={0}
          max={maxGrade}
          step="0.01"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          required
          autoFocus
        />
        <FieldDescription>Out of {formatNumber(maxGrade)}.</FieldDescription>
        <FieldError>{gradeError}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="grade-feedback">Feedback (optional)</FieldLabel>
        <Textarea id="grade-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} />
      </Field>
    </FormDialog>
  );
}
