"use client";

import { useState, type ReactElement } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/teach/form-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ALL_PERMISSIONS, ALL_ROLES, type Permission, type Role, type User } from "@/lib/types";

function CheckboxList<V extends string>({
  idPrefix,
  options,
  value,
  onChange,
  isDisabled,
}: {
  idPrefix: string;
  options: V[];
  value: V[];
  onChange: (value: V[]) => void;
  isDisabled?: (option: V) => boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <FieldLabel key={option} htmlFor={`${idPrefix}-${option}`} className="flex items-center gap-2 font-normal">
          <Checkbox
            id={`${idPrefix}-${option}`}
            checked={value.includes(option)}
            disabled={isDisabled?.(option)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, option] : value.filter((entry) => entry !== option))
            }
          />
          {option}
        </FieldLabel>
      ))}
    </div>
  );
}

const added = <V,>(from: V[], to: V[]) => to.filter((entry) => !from.includes(entry));
const removed = <V,>(from: V[], to: V[]) => from.filter((entry) => !to.includes(entry));

/**
 * Applies role/permission changes one at a time: PUT /users only accepts name/email/password,
 * so access is changed through the assign/revoke endpoints. Returns the user as of the last call.
 */
async function syncAccess(
  user: User,
  roles: { from: Role[]; to: Role[] },
  permissions: { from: Permission[]; to: Permission[] },
  onWrite: () => void
): Promise<User> {
  const calls = [
    ...added(roles.from, roles.to).map((role) => () => api.post<User>(`/users/${user.id}/roles`, { role })),
    ...removed(roles.from, roles.to).map(
      (role) => () => api.delete<User>(`/users/${user.id}/roles/${encodeURIComponent(role)}`)
    ),
    ...added(permissions.from, permissions.to).map(
      (permission) => () => api.post<User>(`/users/${user.id}/permissions`, { permission })
    ),
    ...removed(permissions.from, permissions.to).map(
      (permission) => () => api.delete<User>(`/users/${user.id}/permissions/${encodeURIComponent(permission)}`)
    ),
  ];

  let latest = user;
  for (const call of calls) {
    latest = await call();
    onWrite();
  }
  return latest;
}

interface UserDialogProps {
  /** Omit to create a new user. */
  user?: User;
  trigger: ReactElement;
  /** Called after any successful write (including a partial one), so the list can refresh. */
  onSaved: () => void;
}

export function UserDialog({ user, trigger, onSaved }: UserDialogProps) {
  const { hasRole } = useAuth();
  // The API lets any manage-users holder grant super-admin; the UI keeps that to super-admins.
  const canManageSuperAdmin = hasRole("super-admin");

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const initialRoles = user?.roles ?? [];
  const initialPermissions = user?.permissions ?? [];

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setPasswordConfirmation("");
      setRoles(user ? [...user.roles] : ["student"]);
      setPermissions(user ? [...(user.permissions ?? [])] : []);
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    let wroteSomething = false;
    const markWritten = () => {
      wroteSomething = true;
    };

    try {
      let latest: User;

      if (user) {
        const profile: Record<string, string> = {};
        if (name.trim() !== user.name) profile.name = name.trim();
        if (email.trim() !== user.email) profile.email = email.trim();
        if (password) {
          profile.password = password;
          profile.password_confirmation = passwordConfirmation;
        }
        if (Object.keys(profile).length) {
          latest = await api.put<User>(`/users/${user.id}`, profile);
          markWritten();
        } else {
          latest = user;
        }
        latest = await syncAccess(
          latest,
          { from: initialRoles, to: roles },
          { from: initialPermissions, to: permissions },
          markWritten
        );
      } else {
        latest = await api.post<User>("/users", {
          name: name.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
          roles,
        });
        markWritten();
        // Store only accepts roles; direct permissions are granted afterwards.
        latest = await syncAccess(latest, { from: roles, to: roles }, { from: [], to: permissions }, markWritten);
      }

      // Unchecking a permission that comes from a role is a no-op server-side; say so.
      const stillInherited = removed(initialPermissions, permissions).filter((permission) =>
        latest.permissions?.includes(permission)
      );
      if (stillInherited.length) {
        toast.warning(`${stillInherited.join(", ")} still applies through this user's roles.`);
      }

      toast.success(user ? `Updated ${latest.name}.` : `Created ${latest.name}.`);
      setOpen(false);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not save this user.");
      }
      // A failure partway through the role/permission calls leaves earlier changes applied.
      if (wroteSomething) onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (field: string) => error?.fieldError(field);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      submitting={submitting}
      trigger={trigger}
      title={user ? `Edit ${user.name}` : "New user"}
      onSubmit={handleSubmit}
      submitLabel={user ? "Save changes" : "Create user"}
    >
      <Field data-invalid={!!fieldError("name") || undefined}>
        <FieldLabel htmlFor="user-name">Name</FieldLabel>
        <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} required />
        <FieldError>{fieldError("name")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("email") || undefined}>
        <FieldLabel htmlFor="user-email">Email</FieldLabel>
        <Input
          id="user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <FieldError>{fieldError("email")}</FieldError>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!fieldError("password") || undefined}>
          <FieldLabel htmlFor="user-password">{user ? "New password" : "Password"}</FieldLabel>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required={!user}
          />
          <FieldError>{fieldError("password")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="user-password-confirmation">Confirm password</FieldLabel>
          <Input
            id="user-password-confirmation"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required={!user || password !== ""}
          />
        </Field>
      </div>
      {user && <FieldDescription className="-mt-3">Leave blank to keep the current password.</FieldDescription>}

      <FieldSet>
        <FieldLegend variant="label">Roles</FieldLegend>
        <CheckboxList
          idPrefix="user-role"
          options={ALL_ROLES}
          value={roles}
          onChange={setRoles}
          isDisabled={(role) => role === "super-admin" && !canManageSuperAdmin}
        />
        <FieldError>{fieldError("roles") ?? fieldError("role")}</FieldError>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Direct permissions</FieldLegend>
        <CheckboxList
          idPrefix="user-permission"
          options={ALL_PERMISSIONS}
          value={permissions}
          onChange={setPermissions}
        />
        {user && (
          <FieldDescription>
            Checked items include permissions inherited from roles. To remove an inherited permission, remove the role.
          </FieldDescription>
        )}
        <FieldError>{fieldError("permission")}</FieldError>
      </FieldSet>
    </FormDialog>
  );
}
