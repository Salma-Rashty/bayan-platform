import type { AccessRole } from "@/lib/types";

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Why a role can't be deleted, mirroring RoleController::destroy, or null if it can.
 * The API also counts soft-deleted users, so it may still refuse when this says yes.
 */
export function deleteRoleBlocker(role: AccessRole): string | null {
  if (role.is_system) return "System roles can't be deleted.";
  if (role.users_count > 0) {
    return `Assigned to ${pluralize(role.users_count, "user")}. Reassign them to another role first.`;
  }
  return null;
}
