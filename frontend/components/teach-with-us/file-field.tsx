"use client";

import { useRef, type ReactNode } from "react";
import { FileIcon, UploadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { formatBytes } from "@/lib/teacher-application-form";

/** A file picker showing the chosen file's name and size, with a way to remove it. */
export function FileField({
  id,
  label,
  accept,
  file,
  onChange,
  description,
  error,
  children,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  description: ReactNode;
  error?: string;
  /** Extra notes under the chosen file (e.g. the video's duration). */
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2" data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-invalid={!!error || undefined}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          // Lets the same file be picked again after removing it.
          event.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => input.current?.click()}>
            Replace
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => onChange(null)}>
            <XIcon />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={error ? "w-fit border-destructive" : "w-fit"}
          onClick={() => input.current?.click()}
        >
          <UploadIcon data-icon="inline-start" />
          Choose file
        </Button>
      )}
      {children}
      <FieldDescription>{description}</FieldDescription>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
