"use client";

import { useState, type ReactElement, type ReactNode } from "react";

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

interface ConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  /**
   * Runs the action. The dialog closes when it resolves; the caller owns toasts and error
   * handling, and can return `false` to keep the dialog open (e.g. after a failure).
   */
  onConfirm: () => Promise<boolean | void>;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working...",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      const keepOpen = (await onConfirm()) === false;
      if (!keepOpen) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={handleConfirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
