"use client";

import { useState, type ReactElement } from "react";

import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Material } from "@/lib/types";

interface MaterialDialogProps {
  lessonId: number;
  /** Omit to add a new material. */
  material?: Material;
  trigger: ReactElement;
  onSaved: () => void;
}

/**
 * The API stores a material as a `file_path` string and has no upload endpoint, so
 * materials are added by link (e.g. a shared drive or hosted PDF URL).
 */
export function MaterialDialog({ lessonId, material, trigger, onSaved }: MaterialDialogProps) {
  const [title, setTitle] = useState("");
  const [filePath, setFilePath] = useState("");
  const [type, setType] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setTitle(material?.title ?? "");
    setFilePath(material?.file_path ?? "");
    setType(material?.type ?? "");
  });

  function handleSubmit() {
    const payload = {
      title: title.trim(),
      file_path: filePath.trim(),
      type: type.trim() || null,
    };

    save(
      () =>
        material ? api.put(`/materials/${material.id}`, payload) : api.post(`/lessons/${lessonId}/materials`, payload),
      {
        success: material ? "Material updated." : "Material added.",
        failure: "Could not save this material.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={material ? "Edit material" : "Add material"}
      description="Link to a file hosted elsewhere (PDF, audio, slides...)."
      onSubmit={handleSubmit}
      submitLabel={material ? "Save changes" : "Add material"}
    >
      <Field data-invalid={!!fieldError("title") || undefined}>
        <FieldLabel htmlFor="material-title">Title</FieldLabel>
        <Input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <FieldError>{fieldError("title")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("file_path") || undefined}>
        <FieldLabel htmlFor="material-file">File link</FieldLabel>
        <Input
          id="material-file"
          value={filePath}
          onChange={(event) => setFilePath(event.target.value)}
          placeholder="https://..."
          required
        />
        <FieldError>{fieldError("file_path")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("type") || undefined}>
        <FieldLabel htmlFor="material-type">Type (optional)</FieldLabel>
        <Input
          id="material-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          placeholder="pdf, audio, video..."
        />
        <FieldDescription>A short label shown next to the material.</FieldDescription>
        <FieldError>{fieldError("type")}</FieldError>
      </Field>
    </FormDialog>
  );
}
