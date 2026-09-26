"use client";

import type { ReactNode } from "react";
import { CheckIcon, XIcon } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { CourseApplicationStatus } from "@/lib/types";

export type Decision = "accept" | "reject";

interface DecisionActionsProps {
  status: CourseApplicationStatus;
  /** Who/what is being decided on, e.g. "Amina's application to Arabic 101". */
  subject: string;
  acceptDescription: ReactNode;
  rejectDescription: ReactNode;
  /** Performs the decision; resolve false to keep the confirm dialog open. */
  onDecide: (decision: Decision) => Promise<boolean>;
}

/**
 * Accept/Reject with confirmation, matching the Filament actions: Accept is hidden once
 * accepted and Reject once rejected, so a decision can still be reversed.
 */
export function DecisionActions({
  status,
  subject,
  acceptDescription,
  rejectDescription,
  onDecide,
}: DecisionActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "accepted" && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              <CheckIcon data-icon="inline-start" />
              Accept
            </Button>
          }
          title={`Accept ${subject}?`}
          description={acceptDescription}
          confirmLabel="Accept"
          pendingLabel="Accepting..."
          onConfirm={() => onDecide("accept")}
        />
      )}
      {status !== "rejected" && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <XIcon data-icon="inline-start" />
              Reject
            </Button>
          }
          title={`Reject ${subject}?`}
          description={rejectDescription}
          confirmLabel="Reject"
          pendingLabel="Rejecting..."
          destructive
          onConfirm={() => onDecide("reject")}
        />
      )}
    </div>
  );
}
