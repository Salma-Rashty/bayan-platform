"use client";

import { useAuth } from "@/lib/auth-context";
import type { Permission, Role, User, UserNote } from "@/lib/types";

/** Roles only a super-admin may grant or revoke (UserPolicy::ADMIN_TIER_ROLES). */
export const ADMIN_TIER_ROLES: Role[] = ["super-admin", "admin"];

/** Permissions conferring admin-level control; only a super-admin may grant or revoke them (UserPolicy::ELEVATED_PERMISSIONS). */
export const ELEVATED_PERMISSIONS: Permission[] = ["manage-users", "manage-billing"];

/** Explains to non-super-admins why some permission checkboxes are disabled. */
export const PERMISSION_LIMITS_HINT = `Only a super-admin can change ${ELEVATED_PERMISSIONS.join(" or ")}. You can grant or revoke other permissions you hold yourself.`;

export function isAdminTier(user: Pick<User, "roles">): boolean {
  return user.roles.some((role) => ADMIN_TIER_ROLES.includes(role));
}

/**
 * Mirrors the API's UserPolicy so the UI only offers actions the API will accept:
 * - manage-users is required for everything;
 * - admin and super-admin accounts can only be modified by a super-admin;
 * - nobody can suspend, delete, or change the roles of their own account;
 * - non-super-admins can't grant admin-tier roles, roles bundling elevated permissions, or
 *   elevated permissions, and can only grant or revoke ordinary permissions they hold themselves.
 */
export function useUserAccess() {
  const { user: me, hasRole, hasPermission } = useAuth();
  const isSuperAdmin = hasRole("super-admin");
  const canManage = hasPermission("manage-users");

  const isSelf = (target: Pick<User, "id">) => target.id === me?.id;
  const canModify = (target: Pick<User, "roles">) => canManage && (isSuperAdmin || !isAdminTier(target));

  return {
    me,
    isSuperAdmin,
    canManage,
    isSelf,
    canModify,
    canSuspend: (target: User) => canModify(target) && !isSelf(target),
    canDelete: (target: User) => canModify(target) && !isSelf(target),
    /** Pass no target when creating a user. */
    canChangeRoles: (target?: User) => (target ? canModify(target) && !isSelf(target) : canManage),
    /** Pass `elevatedRoles` from useAccessOptions(). */
    canAssignRole: (role: Role, elevatedRoles: Role[]) =>
      isSuperAdmin || (!ADMIN_TIER_ROLES.includes(role) && !elevatedRoles.includes(role)),
    canAssignPermission: (permission: Permission) =>
      isSuperAdmin || (!ELEVATED_PERMISSIONS.includes(permission) && Boolean(me?.permissions?.includes(permission))),
    canDeleteNote: (note: UserNote) => canManage && (isSuperAdmin || note.author_id === me?.id),
  };
}
