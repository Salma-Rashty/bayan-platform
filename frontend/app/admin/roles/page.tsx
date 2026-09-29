"use client";

import { useState } from "react";
import Link from "next/link";
import { LockIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, LoadError, PageHeader, RequireRole, TableSkeleton } from "@/components/admin/admin-ui";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { RoleProtectionBadge } from "@/components/admin/role-badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import type { AccessPermission, AccessRole, Permission } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";
import { deleteRoleBlocker, pluralize } from "@/lib/role-rules";

function CreateRoleDialog({ permissions, onCreated }: { permissions: AccessPermission[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Permission[]>([]);
  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setName("");
    setSelected([]);
  });

  return (
    <FormDialog
      {...dialogProps}
      trigger={
        <Button>
          <PlusIcon data-icon="inline-start" />
          New role
        </Button>
      }
      title="New role"
      description="Pick the permissions this role grants. You can change them later."
      submitLabel="Create role"
      onSubmit={() =>
        save(
          () => api.post<AccessRole>("/roles", { name: name.trim(), permissions: selected }),
          { success: `Created role "${name.trim()}".`, failure: "Could not create this role." },
          onCreated
        )
      }
    >
      <Field data-invalid={!!fieldError("name") || undefined}>
        <FieldLabel htmlFor="role-name">Name</FieldLabel>
        <Input
          id="role-name"
          placeholder="content-editor"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <FieldDescription>Lowercase letters, numbers and hyphens.</FieldDescription>
        <FieldError>{fieldError("name")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("permissions") || undefined}>
        <FieldLabel>Permissions</FieldLabel>
        <div className="max-h-72 overflow-y-auto">
          <PermissionMatrix
            idPrefix="new-role-permission"
            permissions={permissions}
            value={selected}
            onChange={setSelected}
            compact
          />
        </div>
        <FieldError>{fieldError("permissions") ?? fieldError("permissions.0")}</FieldError>
      </Field>
    </FormDialog>
  );
}

function RolesTable({ roles, onChanged }: { roles: AccessRole[]; onChanged: () => void }) {
  async function deleteRole(role: AccessRole): Promise<boolean> {
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success(`Deleted role "${role.name}".`);
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete this role.");
      return false;
    }
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Users</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => {
            const blocker = deleteRoleBlocker(role);
            return (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/roles/${role.id}`} className="font-medium text-foreground hover:underline">
                      {role.name}
                    </Link>
                    <RoleProtectionBadge role={role} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {role.is_locked ? "All (locked)" : pluralize(role.permissions_count, "permission")}
                </TableCell>
                <TableCell className="text-muted-foreground">{pluralize(role.users_count, "user")}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={role.is_locked ? `View ${role.name}` : `Edit ${role.name}`}
                      title={role.is_locked ? "View" : "Edit permissions"}
                      nativeButton={false}
                      render={<Link href={`/admin/roles/${role.id}`} />}
                    >
                      {role.is_locked ? <LockIcon /> : <PencilIcon />}
                    </Button>
                    {blocker ? (
                      // Disabled buttons swallow hover, so the explanation sits on a wrapper.
                      <span title={blocker} className="inline-flex">
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${role.name} (unavailable)`} disabled>
                          <Trash2Icon />
                        </Button>
                      </span>
                    ) : (
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${role.name}`}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2Icon />
                          </Button>
                        }
                        title="Delete role?"
                        description={<>The role &ldquo;{role.name}&rdquo; will be permanently deleted. No users have it.</>}
                        confirmLabel="Delete"
                        pendingLabel="Deleting..."
                        destructive
                        onConfirm={() => deleteRole(role)}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function RolesManager() {
  const roles = useApiGet<AccessRole[]>("/roles");
  // Only needed to populate the create dialog's permission list.
  const permissions = useApiGet<AccessPermission[]>("/permissions");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Roles bundle permissions; users get access through their roles plus any direct grants."
        actions={<CreateRoleDialog permissions={permissions.data ?? []} onCreated={roles.reload} />}
      />

      {roles.loading && !roles.data ? (
        <TableSkeleton rows={4} />
      ) : roles.error ? (
        <LoadError title="Couldn't load roles" error={roles.error} onRetry={roles.reload} />
      ) : !roles.data || roles.data.length === 0 ? (
        <EmptyState>No roles yet.</EmptyState>
      ) : (
        <RolesTable roles={roles.data} onChanged={roles.reload} />
      )}
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <RequireRole role="super-admin">
      <RolesManager />
    </RequireRole>
  );
}
