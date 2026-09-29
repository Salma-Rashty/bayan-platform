"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import type { Permission, PermissionInfo } from "@/lib/types";

/** Groups permissions by their `group`, keeping the API's order (catalog order, then custom). */
export function groupPermissions<P extends PermissionInfo>(permissions: P[]): [string, P[]][] {
  const groups = new Map<string, P[]>();
  for (const permission of permissions) {
    groups.set(permission.group, [...(groups.get(permission.group) ?? []), permission]);
  }
  return [...groups.entries()];
}

export function NotWiredBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground" title="No feature checks this permission yet">
      Not wired
    </Badge>
  );
}

interface PermissionMatrixProps {
  permissions: PermissionInfo[];
  value: Permission[];
  onChange: (value: Permission[]) => void;
  disabled?: boolean;
  /** Hides descriptions, for tight spaces like the create dialog. */
  compact?: boolean;
  idPrefix?: string;
}

/** Every permission as a toggle, grouped by area, with a per-group "all" toggle. */
export function PermissionMatrix({
  permissions,
  value,
  onChange,
  disabled = false,
  compact = false,
  idPrefix = "permission",
}: PermissionMatrixProps) {
  const toggle = (name: Permission, on: boolean) =>
    onChange(on ? [...value, name] : value.filter((entry) => entry !== name));

  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {groupPermissions(permissions).map(([group, members]) => {
        const names = members.map((permission) => permission.name);
        const onCount = names.filter((name) => value.includes(name)).length;
        const groupId = `${idPrefix}-group-${group.toLowerCase().replace(/\W+/g, "-")}`;

        return (
          <div key={group} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{group}</span>
              {members.length > 1 && (
                <FieldLabel htmlFor={groupId} className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Checkbox
                    id={groupId}
                    checked={onCount === members.length}
                    indeterminate={onCount > 0 && onCount < members.length}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onChange(
                        checked
                          ? [...value, ...names.filter((name) => !value.includes(name))]
                          : value.filter((entry) => !names.includes(entry))
                      )
                    }
                  />
                  All
                </FieldLabel>
              )}
            </div>
            {members.map((permission) => {
              const id = `${idPrefix}-${permission.name}`;
              return (
                <FieldLabel key={permission.name} htmlFor={id} className="flex items-start gap-2.5 font-normal">
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    checked={value.includes(permission.name)}
                    disabled={disabled}
                    onCheckedChange={(checked) => toggle(permission.name, checked)}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground">{permission.label}</span>
                      <code className="text-xs text-muted-foreground">{permission.name}</code>
                      {!permission.wired && <NotWiredBadge />}
                    </span>
                    {!compact && permission.description && (
                      <span className="text-xs text-muted-foreground">{permission.description}</span>
                    )}
                  </span>
                </FieldLabel>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
