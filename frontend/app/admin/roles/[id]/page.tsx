"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, LockIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, LoadError, RequireRole } from "@/components/admin/admin-ui";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { RoleProtectionBadge } from "@/components/admin/role-badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { deleteRoleBlocker, pluralize } from "@/lib/role-rules";
import type { AccessPermission, AccessRole, Permission } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

const sameSet = <V,>(a: V[], b: V[]) => a.length === b.length && a.every((entry) => b.includes(entry));

function RoleEditor({
  role,
  allPermissions,
  onSaved,
}: {
  role: AccessRole;
  allPermissions: AccessPermission[];
  onSaved: (role: AccessRole) => void;
}) {
  const [name, setName] = useState(role.name);
  const [permissions, setPermissions] = useState<Permission[]>(role.permissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const renamable = !role.is_system;
  const nameChanged = renamable && name.trim() !== role.name;
  const permissionsChanged = !sameSet(permissions, role.permissions);
  const dirty = nameChanged || permissionsChanged;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<AccessRole>(`/roles/${role.id}`, {
        ...(nameChanged && { name: name.trim() }),
        ...(permissionsChanged && { permissions }),
      });
      toast.success(
        updated.users_count > 0
          ? `Saved "${updated.name}". ${pluralize(updated.users_count, "user")} updated.`
          : `Saved "${updated.name}".`
      );
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not save this role.");
      }
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setName(role.name);
    setPermissions(role.permissions);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!error?.fieldError("name") || undefined}>
            <FieldLabel htmlFor="role-name" className="sr-only">
              Role name
            </FieldLabel>
            <Input
              id="role-name"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!renamable}
              className="sm:max-w-sm"
            />
            <FieldDescription>
              {renamable
                ? "Lowercase letters, numbers and hyphens."
                : "System roles are referenced by the application's code, so they can't be renamed."}
            </FieldDescription>
            <FieldError>{error?.fieldError("name")}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            {pluralize(permissions.length, "permission")} of {allPermissions.length} granted.
            {allPermissions.some((permission) => !permission.wired) &&
              " Permissions marked “Not wired” aren't checked by any feature yet, so granting them has no effect for now."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PermissionMatrix
            idPrefix="role-permission"
            permissions={allPermissions}
            value={permissions}
            onChange={setPermissions}
          />
          <FieldError>{error?.fieldError("permissions") ?? error?.fieldError("permissions.0")}</FieldError>
        </CardContent>
      </Card>

      {/* Sticky so the save stays reachable below a long permission list. */}
      <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-xl bg-background/80 p-2 backdrop-blur">
        {dirty && <span className="mr-auto pl-2 text-sm text-muted-foreground">Unsaved changes</span>}
        <Button variant="ghost" onClick={discard} disabled={!dirty || saving}>
          Discard
        </Button>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function LockedRoleView({ allPermissions }: { allPermissions: AccessPermission[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Every permission, including any added later.</CardDescription>
      </CardHeader>
      <CardContent>
        <PermissionMatrix
          idPrefix="role-permission"
          permissions={allPermissions}
          value={allPermissions.map((permission) => permission.name)}
          onChange={() => {}}
          disabled
        />
      </CardContent>
    </Card>
  );
}

function DeleteRoleButton({ role, onDeleted }: { role: AccessRole; onDeleted: () => void }) {
  const blocker = deleteRoleBlocker(role);

  if (blocker) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="destructive" disabled>
          <Trash2Icon data-icon="inline-start" />
          Delete role
        </Button>
        <p className="max-w-64 text-right text-xs text-muted-foreground">{blocker}</p>
      </div>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2Icon data-icon="inline-start" />
          Delete role
        </Button>
      }
      title="Delete role?"
      description={<>The role &ldquo;{role.name}&rdquo; will be permanently deleted. No users have it.</>}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      destructive
      onConfirm={async () => {
        try {
          await api.delete(`/roles/${role.id}`);
          toast.success(`Deleted role "${role.name}".`);
          onDeleted();
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : "Could not delete this role.");
          return false;
        }
      }}
    />
  );
}

function RoleDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const role = useApiGet<AccessRole>(`/roles/${params.id}`);
  const permissions = useApiGet<AccessPermission[]>("/permissions");

  if ((role.loading && !role.data) || (permissions.loading && !permissions.data)) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (role.errorStatus === 404) {
    return <EmptyState>This role doesn&apos;t exist.</EmptyState>;
  }

  if (role.error || !role.data) {
    return <LoadError title="Couldn't load this role" error={role.error ?? "Something went wrong."} onRetry={role.reload} />;
  }

  if (permissions.error || !permissions.data) {
    return (
      <LoadError
        title="Couldn't load permissions"
        error={permissions.error ?? "Something went wrong."}
        onRetry={permissions.reload}
      />
    );
  }

  const current = role.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{current.name}</h1>
            <RoleProtectionBadge role={current} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <UsersIcon className="size-4" />
            {pluralize(current.users_count, "user")} {current.users_count === 1 ? "has" : "have"} this role
          </p>
        </div>
        {!current.is_locked && <DeleteRoleButton role={current} onDeleted={() => router.push("/admin/roles")} />}
      </div>

      {current.is_locked ? (
        <Alert>
          <LockIcon />
          <AlertTitle>This role is locked</AlertTitle>
          <AlertDescription>
            super-admin passes every permission check and can&apos;t be renamed, edited or deleted.
          </AlertDescription>
        </Alert>
      ) : (
        current.users_count > 0 && (
          <Alert>
            <UsersIcon />
            <AlertTitle>Changes apply to everyone with this role</AlertTitle>
            <AlertDescription>
              Saving updates access for all {pluralize(current.users_count, "user")} immediately.
            </AlertDescription>
          </Alert>
        )
      )}

      {current.is_locked ? (
        <LockedRoleView allPermissions={permissions.data} />
      ) : (
        <RoleEditor
          // Re-initialise the form from the saved values after each save.
          key={`${current.id}-${current.name}-${current.permissions.join(",")}`}
          role={current}
          allPermissions={permissions.data}
          onSaved={(updated) => role.setData(updated)}
        />
      )}
    </div>
  );
}

export default function AdminRolePage() {
  return (
    <RequireRole role="super-admin">
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/roles"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All roles
        </Link>
        <RoleDetail />
      </div>
    </RequireRole>
  );
}
