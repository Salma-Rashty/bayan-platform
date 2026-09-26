"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api";

/**
 * Open/submit state for a FormDialog. `resetFields` runs each time the dialog opens so an
 * edit dialog always starts from the entity's current values. Validation errors (422) stay
 * in the dialog as per-field messages; anything else becomes a toast.
 */
export function useFormDialog(resetFields: () => void) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  function onOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetFields();
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function save(
    request: () => Promise<unknown>,
    messages: { success: string; failure: string },
    onSaved: () => void
  ) {
    setSubmitting(true);
    setError(null);
    try {
      await request();
      toast.success(messages.success);
      setOpen(false);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err);
      } else {
        toast.error(err instanceof ApiError ? err.message : messages.failure);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return {
    dialogProps: { open, onOpenChange, submitting },
    fieldError: (field: string) => error?.fieldError(field),
    save,
  };
}

interface FormDialogProps {
  trigger: ReactElement;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  children: ReactNode;
}

/** Shared shell for the create/edit dialogs on the teach screens. */
export function FormDialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  onSubmit,
  submitting,
  submitLabel,
  children,
}: FormDialogProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <FieldGroup>{children}</FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
