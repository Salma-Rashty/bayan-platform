"use client";

import { useState, type ReactElement } from "react";

import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Quiz } from "@/lib/types";

interface QuizDialogProps {
  lessonId: number;
  /** Omit to create a new quiz. */
  quiz?: Quiz;
  trigger: ReactElement;
  onSaved: () => void;
}

/** Edits a quiz's title/description; questions and options are managed separately. */
export function QuizDialog({ lessonId, quiz, trigger, onSaved }: QuizDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setTitle(quiz?.title ?? "");
    setDescription(quiz?.description ?? "");
  });

  function handleSubmit() {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
    };

    save(
      () => (quiz ? api.put(`/quizzes/${quiz.id}`, payload) : api.post(`/lessons/${lessonId}/quizzes`, payload)),
      {
        success: quiz ? "Quiz updated." : "Quiz created.",
        failure: "Could not save this quiz.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={quiz ? "Edit quiz" : "New quiz"}
      onSubmit={handleSubmit}
      submitLabel={quiz ? "Save changes" : "Create quiz"}
    >
      <Field data-invalid={!!fieldError("title") || undefined}>
        <FieldLabel htmlFor="quiz-title">Title</FieldLabel>
        <Input id="quiz-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <FieldError>{fieldError("title")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("description") || undefined}>
        <FieldLabel htmlFor="quiz-description">Description</FieldLabel>
        <Textarea
          id="quiz-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError>{fieldError("description")}</FieldError>
      </Field>
    </FormDialog>
  );
}
