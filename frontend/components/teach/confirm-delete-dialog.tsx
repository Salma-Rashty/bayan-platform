"use client";

import type { ReactElement } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { api, ApiError } from "@/lib/api";

interface ConfirmDeleteDialogProps {
  trigger: ReactElement;
  /** e.g. "lesson" — used in the title and toasts. */
  noun: string;
  name: string;
  /** API path to DELETE, e.g. `/lessons/3`. */
  path: string;
  onDeleted: () => void;
}

export function ConfirmDeleteDialog({ trigger, noun, name, path, onDeleted }: ConfirmDeleteDialogProps) {
  async function handleDelete() {
    try {
      await api.delete(path);
      toast.success(`Deleted ${noun} "${name}".`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not delete this ${noun}.`);
      return false;
    }
  }

  return (
    <ConfirmDialog
      trigger={trigger}
      title={`Delete ${noun}?`}
      description={<>&ldquo;{name}&rdquo; will be removed. An administrator can restore it later if needed.</>}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      destructive
      onConfirm={handleDelete}
    />
  );
}
