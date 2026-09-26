"use client";

import { useState, type ReactElement } from "react";

import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Lesson } from "@/lib/types";

interface LessonDialogProps {
  courseId: number;
  /** Omit to create a new lesson. */
  lesson?: Lesson;
  trigger: ReactElement;
  onSaved: () => void;
}

export function LessonDialog({ courseId, lesson, trigger, onSaved }: LessonDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setTitle(lesson?.title ?? "");
    setDescription(lesson?.description ?? "");
    setOrder(lesson ? String(lesson.order) : "");
  });

  function handleSubmit() {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      // `order` is NOT NULL in the database, so leave it out rather than sending null.
      ...(order.trim() !== "" && { order: Number(order) }),
    };

    save(
      () => (lesson ? api.put(`/lessons/${lesson.id}`, payload) : api.post(`/courses/${courseId}/lessons`, payload)),
      {
        success: lesson ? "Lesson updated." : "Lesson created.",
        failure: "Could not save this lesson.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={lesson ? "Edit lesson" : "New lesson"}
      onSubmit={handleSubmit}
      submitLabel={lesson ? "Save changes" : "Create lesson"}
    >
      <Field data-invalid={!!fieldError("title") || undefined}>
        <FieldLabel htmlFor="lesson-title">Title</FieldLabel>
        <Input id="lesson-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <FieldError>{fieldError("title")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("description") || undefined}>
        <FieldLabel htmlFor="lesson-description">Description</FieldLabel>
        <Textarea
          id="lesson-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError>{fieldError("description")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("order") || undefined}>
        <FieldLabel htmlFor="lesson-order">Order</FieldLabel>
        <Input
          id="lesson-order"
          type="number"
          min={0}
          step={1}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        />
        <FieldDescription>Lessons are listed in ascending order.</FieldDescription>
        <FieldError>{fieldError("order")}</FieldError>
      </Field>
    </FormDialog>
  );
}
