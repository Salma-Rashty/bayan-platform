"use client";

import { useState } from "react";
import { BanIcon, CircleCheckIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";
import { useUserAccess } from "@/lib/user-access";
import { deleteUser, restoreUser, setUserStatus } from "@/lib/user-actions";

interface UserLifecycleActionsProps {
  user: User;
  /** Icon-only buttons for table rows; labelled buttons otherwise. */
  compact?: boolean;
  /** Called with the updated user after a status change or restore. */
  onChanged: (user: User) => void;
  onDeleted: (user: User) => void;
}

/**
 * Suspend/reactivate, delete and restore, each shown only when the API would allow it
 * (see useUserAccess): nothing for your own account, nothing on admin accounts unless
 * you're a super-admin.
 */
export function UserLifecycleActions({ user, compact = false, onChanged, onDeleted }: UserLifecycleActionsProps) {
  const { canSuspend, canDelete, canModify } = useUserAccess();
  const [restoring, setRestoring] = useState(false);

  const deleted = Boolean(user.deleted_at);
  const suspended = user.status === "suspended";

  if (deleted) {
    if (!canModify(user)) return null;
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={restoring}
        onClick={async () => {
          setRestoring(true);
          const restored = await restoreUser(user);
          setRestoring(false);
          if (restored) onChanged(restored);
        }}
      >
        <RotateCcwIcon data-icon="inline-start" />
        {restoring ? "Restoring..." : "Restore"}
      </Button>
    );
  }

  return (
    <>
      {canSuspend(user) && (
        <ConfirmDialog
          trigger={
            compact ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${suspended ? "Reactivate" : "Suspend"} ${user.name}`}
                title={suspended ? "Reactivate" : "Suspend"}
              >
                {suspended ? <CircleCheckIcon /> : <BanIcon />}
              </Button>
            ) : (
              <Button variant="outline">
                {suspended ? <CircleCheckIcon data-icon="inline-start" /> : <BanIcon data-icon="inline-start" />}
                {suspended ? "Reactivate" : "Suspend"}
              </Button>
            )
          }
          title={suspended ? "Reactivate user?" : "Suspend user?"}
          description={
            suspended ? (
              <>{user.name} will be able to sign in again.</>
            ) : (
              <>
                {user.name} will be signed out and blocked from signing in until reactivated. Their data is kept.
              </>
            )
          }
          confirmLabel={suspended ? "Reactivate" : "Suspend"}
          pendingLabel={suspended ? "Reactivating..." : "Suspending..."}
          destructive={!suspended}
          onConfirm={async () => {
            const updated = await setUserStatus(user, suspended ? "active" : "suspended");
            if (!updated) return false;
            onChanged(updated);
          }}
        />
      )}
      {canDelete(user) && (
        <ConfirmDialog
          trigger={
            compact ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${user.name}`}
                title="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon />
              </Button>
            ) : (
              <Button variant="destructive">
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            )
          }
          title="Delete user?"
          description={
            <>
              {user.name} ({user.email}) will be soft-deleted and can no longer sign in. You can restore the account
              afterwards from the Deleted filter.
            </>
          }
          confirmLabel="Delete"
          pendingLabel="Deleting..."
          destructive
          onConfirm={async () => {
            const ok = await deleteUser(user, onChanged);
            if (!ok) return false;
            onDeleted(user);
          }}
        />
      )}
    </>
  );
}
