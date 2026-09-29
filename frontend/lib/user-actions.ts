import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { User, UserStatus } from "@/lib/types";

function failed(err: unknown, fallback: string) {
  toast.error(err instanceof ApiError ? err.message : fallback);
}

/** Suspends or reactivates a user. Resolves to the updated user, or null on failure. */
export async function setUserStatus(user: User, status: UserStatus): Promise<User | null> {
  try {
    const updated = await api.patch<User>(`/users/${user.id}/status`, { status });
    toast.success(status === "suspended" ? `Suspended ${user.name}.` : `Reactivated ${user.name}.`);
    return updated;
  } catch (err) {
    failed(err, status === "suspended" ? "Could not suspend this user." : "Could not reactivate this user.");
    return null;
  }
}

/** Restores a soft-deleted user. Resolves to the restored user, or null on failure. */
export async function restoreUser(user: User): Promise<User | null> {
  try {
    const restored = await api.patch<User>(`/users/${user.id}/restore`);
    toast.success(`Restored ${user.name}.`);
    return restored;
  } catch (err) {
    failed(err, "Could not restore this user.");
    return null;
  }
}

/**
 * Soft-deletes a user; the success toast offers Undo, which calls `onRestored`.
 * Resolves to false on failure (so a confirm dialog can stay open).
 */
export async function deleteUser(user: User, onRestored: (user: User) => void): Promise<boolean> {
  try {
    await api.delete(`/users/${user.id}`);
    toast.success(`Deleted ${user.name}.`, {
      action: {
        label: "Undo",
        onClick: () => {
          void restoreUser(user).then((restored) => restored && onRestored(restored));
        },
      },
    });
    return true;
  } catch (err) {
    failed(err, "Could not delete this user.");
    return false;
  }
}
