"use client";

import { useState, type ReactElement } from "react";

import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toDateTimeLocalValue } from "@/lib/format";
import type { Assignment } from "@/lib/types";

interface AssignmentDialogProps {
  lessonId: number;
  /** Omit to create a new assignment. */
  assignment?: Assignment;
  trigger: ReactElement;
  onSaved: () => void;
}

export function AssignmentDialog({ lessonId, assignment, trigger, onSaved }: AssignmentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxGrade, setMaxGrade] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setTitle(assignment?.title ?? "");
    setDescription(assignment?.description ?? "");
    setDueAt(toDateTimeLocalValue(assignment?.due_at));
    setMaxGrade(assignment ? String(Number(assignment.max_grade)) : "");
  });

  function handleSubmit() {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      // Sent as ISO so the server receives an unambiguous instant, not the browser's wall-clock time.
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      // `max_grade` is NOT NULL (defaults to 100), so leave it out rather than sending null.
      ...(maxGrade.trim() !== "" && { max_grade: Number(maxGrade) }),
    };

    save(
      () =>
        assignment
          ? api.put(`/assignments/${assignment.id}`, payload)
          : api.post(`/lessons/${lessonId}/assignments`, payload),
      {
        success: assignment ? "Assignment updated." : "Assignment created.",
        failure: "Could not save this assignment.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={assignment ? "Edit assignment" : "New assignment"}
      onSubmit={handleSubmit}
      submitLabel={assignment ? "Save changes" : "Create assignment"}
    >
      <Field data-invalid={!!fieldError("title") || undefined}>
        <FieldLabel htmlFor="assignment-title">Title</FieldLabel>
        <Input id="assignment-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <FieldError>{fieldError("title")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("description") || undefined}>
        <FieldLabel htmlFor="assignment-description">Instructions</FieldLabel>
        <Textarea
          id="assignment-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError>{fieldError("description")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("due_at") || undefined}>
        <FieldLabel htmlFor="assignment-due">Due (optional)</FieldLabel>
        <Input
          id="assignment-due"
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        <FieldError>{fieldError("due_at")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("max_grade") || undefined}>
        <FieldLabel htmlFor="assignment-max-grade">Max grade</FieldLabel>
        <Input
          id="assignment-max-grade"
          type="number"
          min={0}
          step="0.01"
          value={maxGrade}
          onChange={(event) => setMaxGrade(event.target.value)}
          placeholder="100"
        />
        {!assignment && <FieldDescription>Defaults to 100 if left blank.</FieldDescription>}
        <FieldError>{fieldError("max_grade")}</FieldError>
      </Field>
    </FormDialog>
  );
}
