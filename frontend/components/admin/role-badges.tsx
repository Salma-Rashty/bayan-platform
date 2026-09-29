import { LockIcon, ShieldIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AccessRole } from "@/lib/types";

/** Marks system roles (no rename/delete) and the locked super-admin role (no edits at all). */
export function RoleProtectionBadge({ role }: { role: Pick<AccessRole, "is_system" | "is_locked"> }) {
  if (role.is_locked) {
    return (
      <Badge variant="secondary" title="Always has every permission; can't be changed.">
        <LockIcon />
        Locked
      </Badge>
    );
  }

  if (role.is_system) {
    return (
      <Badge variant="outline" title="Used by the application: permissions are editable, but it can't be renamed or deleted.">
        <ShieldIcon />
        System
      </Badge>
    );
  }

  return null;
}
