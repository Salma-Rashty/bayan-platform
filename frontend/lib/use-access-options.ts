"use client";

import { ALL_PERMISSIONS, ALL_ROLES, type AccessOptions, type Permission, type Role } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

/**
 * The live role/permission lists for the user screens, including custom ones created on
 * /admin/roles. Falls back to the seeded lists while loading or if the request fails.
 */
export function useAccessOptions(): { roles: Role[]; permissions: Permission[]; elevatedRoles: Role[] } {
  const { data } = useApiGet<AccessOptions>("/users/access-options");

  return {
    roles: data?.roles ?? ALL_ROLES,
    permissions: data?.permissions.map((permission) => permission.name) ?? ALL_PERMISSIONS,
    elevatedRoles: data?.elevated_roles ?? [],
  };
}
