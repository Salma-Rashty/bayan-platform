"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { TeacherApplication, TeacherApplicationStatus } from "@/lib/types";

const ADVANCE_LABELS: Partial<Record<TeacherApplicationStatus, string>> = {
  reviewing: "Start review",
  interview: "Move to interview",
};

/**
 * The next steps in the review pipeline (pending -> reviewing -> interview -> accepted, or
 * rejected from any open stage), as offered by the API's allowed_transitions.
 */
export function TeacherApplicationActions({
  application,
  onChanged,
}: {
  application: TeacherApplication;
  onChanged: (updated: TeacherApplication) => void;
}) {
  async function move(status: TeacherApplicationStatus): Promise<boolean> {
    try {
      const updated = await api.patch<TeacherApplication>(`/teacher-applications/${application.id}/status`, { status });
      onChanged(updated);
      toast.success(
        status === "accepted"
          ? `Accepted — ${application.name} now has the teacher role.`
          : status === "rejected"
            ? `Rejected ${application.name}'s application.`
            : `${application.name}'s application moved to ${status}.`
      );
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this application.");
      return false;
    }
  }

  const allowed = application.allowed_transitions;
  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {allowed
        .filter((status) => ADVANCE_LABELS[status])
        .map((status) => (
          <Button key={status} size="sm" variant="outline" onClick={() => move(status)}>
            <ArrowRightIcon data-icon="inline-start" />
            {ADVANCE_LABELS[status]}
          </Button>
        ))}
      {allowed.includes("accepted") && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              <CheckIcon data-icon="inline-start" />
              Accept
            </Button>
          }
          title={`Accept ${application.name}'s application?`}
          description={
            <>
              {application.email} will get the teacher role. If no account exists for that email, one is created with a
              random password and <strong>no email is sent</strong>, so they&apos;ll need their password set before they
              can sign in. Accepting is final.
            </>
          }
          confirmLabel="Accept"
          pendingLabel="Accepting..."
          onConfirm={() => move("accepted")}
        />
      )}
      {allowed.includes("rejected") && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <XIcon data-icon="inline-start" />
              Reject
            </Button>
          }
          title={`Reject ${application.name}'s application?`}
          description="The application will be marked rejected. This is final, and the applicant is not notified automatically."
          confirmLabel="Reject"
          pendingLabel="Rejecting..."
          destructive
          onConfirm={() => move("rejected")}
        />
      )}
    </div>
  );
}
