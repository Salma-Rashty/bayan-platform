"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, KeyRoundIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, LoadError, RequirePermission } from "@/components/admin/admin-ui";
import { CheckboxList } from "@/components/admin/checkbox-list";
import { CountrySelect } from "@/components/admin/country-select";
import { TagPicker } from "@/components/admin/tag-picker";
import { UserStatusBadge } from "@/components/admin/user-badges";
import { UserLifecycleActions } from "@/components/admin/user-lifecycle-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EnrollmentStatusBadge } from "@/components/status-badge";
import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  type Permission,
  type Role,
  type Tag,
  type User,
  type UserNote,
} from "@/lib/types";
import { useAccessOptions } from "@/lib/use-access-options";
import { useApiGet } from "@/lib/use-api-get";
import { PERMISSION_LIMITS_HINT, useUserAccess } from "@/lib/user-access";

type OnUserSaved = (user: User) => void;

const sameSet = <V,>(a: V[], b: V[]) => a.length === b.length && a.every((entry) => b.includes(entry));

function ProfileSection({ user, canEdit, onSaved }: { user: User; canEdit: boolean; onSaved: OnUserSaved }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fieldError = (field: string) => error?.fieldError(field);

  const changes: Record<string, string | null> = {};
  if (name.trim() !== user.name) changes.name = name.trim();
  if (email.trim() !== user.email) changes.email = email.trim();
  if (phone.trim() !== (user.phone ?? "")) changes.phone = phone.trim() || null;
  if (country !== (user.country ?? "")) changes.country = country || null;
  const dirty = Object.keys(changes).length > 0;

  function reset() {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<User>(`/users/${user.id}`, changes);
      toast.success("Profile saved.");
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not save the profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!fieldError("name") || undefined}>
                <FieldLabel htmlFor="user-name">Name</FieldLabel>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                <FieldError>{fieldError("name")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("email") || undefined}>
                <FieldLabel htmlFor="user-email">Email</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                <FieldError>{fieldError("email")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("phone") || undefined}>
                <FieldLabel htmlFor="user-phone">Phone</FieldLabel>
                <Input
                  id="user-phone"
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!canEdit}
                  placeholder={canEdit ? undefined : "—"}
                />
                <FieldError>{fieldError("phone")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("country") || undefined}>
                <FieldLabel htmlFor="user-country">Country</FieldLabel>
                <CountrySelect
                  id="user-country"
                  className="w-full"
                  emptyLabel={canEdit ? "Not set" : "—"}
                  value={country}
                  onChange={setCountry}
                  disabled={!canEdit}
                />
                <FieldError>{fieldError("country")}</FieldError>
              </Field>
            </div>
            {canEdit && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={reset} disabled={!dirty || saving}>
                  Discard
                </Button>
                <Button type="submit" disabled={!dirty || saving}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function AccessSection({ user, canEdit, onSaved }: { user: User; canEdit: boolean; onSaved: OnUserSaved }) {
  const { isSuperAdmin, isSelf, canChangeRoles, canAssignRole, canAssignPermission } = useUserAccess();
  const accessOptions = useAccessOptions();
  const initialPermissions = user.direct_permissions ?? [];
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [saving, setSaving] = useState(false);

  const rolesEditable = canEdit && canChangeRoles(user);
  const rolesChanged = !sameSet(roles, user.roles);
  const permissionsChanged = !sameSet(permissions, initialPermissions);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.put<User>(`/users/${user.id}`, {
        ...(rolesChanged && { roles }),
        ...(permissionsChanged && { permissions }),
      });
      toast.success("Access updated.");
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update access.");
    } finally {
      setSaving(false);
    }
  }

  // Effective permissions that come only from a role, based on the saved roles.
  const inherited = (permission: Permission) =>
    user.permissions?.includes(permission) && !initialPermissions.includes(permission) ? "via role" : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; permissions</CardTitle>
        <CardDescription>Roles grant bundles of permissions; direct permissions add to them.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field>
          <FieldLabel>Roles</FieldLabel>
          <CheckboxList
            idPrefix="user-role"
            options={accessOptions.roles}
            value={roles}
            onChange={setRoles}
            isDisabled={(role) => !rolesEditable || !canAssignRole(role, accessOptions.elevatedRoles)}
          />
          {canEdit && isSelf(user) && <FieldDescription>You can&apos;t change your own roles.</FieldDescription>}
        </Field>
        <Field>
          <FieldLabel>Direct permissions</FieldLabel>
          <CheckboxList
            idPrefix="user-permission"
            options={accessOptions.permissions}
            value={permissions}
            onChange={setPermissions}
            isDisabled={(permission) => !canEdit || !canAssignPermission(permission)}
            hint={inherited}
          />
          {canEdit && !isSuperAdmin && <FieldDescription>{PERMISSION_LIMITS_HINT}</FieldDescription>}
        </Field>
        {canEdit && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={(!rolesChanged && !permissionsChanged) || saving}
              onClick={() => {
                setRoles(user.roles);
                setPermissions(initialPermissions);
              }}
            >
              Discard
            </Button>
            <Button disabled={(!rolesChanged && !permissionsChanged) || saving} onClick={save}>
              {saving ? "Saving..." : "Save access"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TagsSection({ user, canEdit, onSaved }: { user: User; canEdit: boolean; onSaved: OnUserSaved }) {
  const { data: allTags, setData: setAllTags } = useApiGet<Tag[]>("/tags");
  const [saving, setSaving] = useState(false);

  async function save(tags: Tag[]) {
    setSaving(true);
    try {
      const updated = await api.put<User>(`/users/${user.id}`, { tags: tags.map((tag) => tag.id) });
      toast.success("Tags updated.");
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update tags.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <TagPicker
          allTags={allTags ?? []}
          value={user.tags ?? []}
          onChange={save}
          onTagCreated={(tag) => setAllTags((current) => [...(current ?? []), tag])}
          disabled={!canEdit || saving}
        />
      </CardContent>
    </Card>
  );
}

function EnrollmentsSection({ user }: { user: User }) {
  const enrollments = user.enrollments ?? [];

  return (
    <Card className={enrollments.length ? "pb-0" : undefined}>
      <CardHeader>
        <CardTitle>Enrollments</CardTitle>
      </CardHeader>
      {enrollments.length === 0 ? (
        <CardContent className="text-sm text-muted-foreground">Not enrolled in any courses.</CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell className="pl-4 font-medium text-foreground">
                  {enrollment.course?.title ?? `Course #${enrollment.course_id}`}
                  {enrollment.course?.deleted_at && (
                    <span className="ml-2 text-xs text-muted-foreground">(course deleted)</span>
                  )}
                </TableCell>
                <TableCell>
                  <EnrollmentStatusBadge status={enrollment.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(enrollment.enrolled_at) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function NotesSection({
  user,
  onNotesChange,
}: {
  user: User;
  onNotesChange: (update: (notes: UserNote[]) => UserNote[]) => void;
}) {
  const { canManage, canDeleteNote } = useUserAccess();
  const [body, setBody] = useState("");
  const [adding, setAdding] = useState(false);
  const notes = user.notes ?? [];

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setAdding(true);
    try {
      const note = await api.post<UserNote>(`/users/${user.id}/notes`, { body: body.trim() });
      onNotesChange((current) => [note, ...current]);
      setBody("");
      toast.success("Note added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.fieldError("body") ?? err.message) : "Could not add the note.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteNote(note: UserNote): Promise<boolean> {
    try {
      await api.delete(`/notes/${note.id}`);
      onNotesChange((current) => current.filter((entry) => entry.id !== note.id));
      toast.success("Note deleted.");
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete the note.");
      return false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>Internal to admins — never shown to the user.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canManage && (
          <form onSubmit={addNote} className="flex flex-col gap-2">
            <Textarea
              aria-label="New note"
              placeholder="Add a note…"
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={adding || !body.trim()}>
                {adding ? "Adding..." : "Add note"}
              </Button>
            </div>
          </form>
        )}
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {notes.map((note) => (
              <li key={note.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.author?.name ?? "Unknown author"} · {formatDateTime(note.created_at)}
                  </p>
                </div>
                {canDeleteNote(note) && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete note"
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2Icon />
                      </Button>
                    }
                    title="Delete note?"
                    description="The note will be removed from this user's record."
                    confirmLabel="Delete"
                    pendingLabel="Deleting..."
                    destructive
                    onConfirm={() => deleteNote(note)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function MetaSection({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col divide-y text-sm">
          <MetaRow label="Status">
            <UserStatusBadge status={user.status} deleted={Boolean(user.deleted_at)} />
          </MetaRow>
          <MetaRow label="Last login">{formatDateTime(user.last_login_at) ?? "Never"}</MetaRow>
          <MetaRow label="Created">{formatDateTime(user.created_at) ?? "—"}</MetaRow>
          <MetaRow label="Updated">{formatDateTime(user.updated_at) ?? "—"}</MetaRow>
          {user.deleted_at && <MetaRow label="Deleted">{formatDateTime(user.deleted_at)}</MetaRow>}
        </dl>
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ user }: { user: User }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setPassword("");
    setPasswordConfirmation("");
  });

  return (
    <FormDialog
      {...dialogProps}
      trigger={
        <Button variant="outline">
          <KeyRoundIcon data-icon="inline-start" />
          Reset password
        </Button>
      }
      title={`Reset password for ${user.name}`}
      description="Sets a new password and signs the user out of all their sessions. Share it with them securely."
      submitLabel="Set password"
      onSubmit={() =>
        save(
          () =>
            api.post(`/users/${user.id}/reset-password`, {
              password,
              password_confirmation: passwordConfirmation,
            }),
          { success: `Password updated for ${user.name}.`, failure: "Could not reset the password." },
          () => {}
        )
      }
    >
      <Field data-invalid={!!fieldError("password") || undefined}>
        <FieldLabel htmlFor="reset-password">New password</FieldLabel>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FieldError>{fieldError("password")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="reset-password-confirmation">Confirm password</FieldLabel>
        <Input
          id="reset-password-confirmation"
          type="password"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
        />
      </Field>
    </FormDialog>
  );
}

function UserDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canModify, isSelf } = useUserAccess();
  const { data: user, setData: setUser, loading, error, errorStatus, reload } = useApiGet<User>(`/users/${params.id}`);

  if (loading && !user) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (errorStatus === 404) {
    return <EmptyState>This user doesn&apos;t exist.</EmptyState>;
  }

  if (error || !user) {
    return <LoadError title="Couldn't load this user" error={error ?? "Something went wrong."} onRetry={reload} />;
  }

  const deleted = Boolean(user.deleted_at);
  const modifiable = canModify(user);
  // Deleted accounts must be restored before they can be edited (the API 404s otherwise).
  const canEdit = modifiable && !deleted;
  // Keyed on updated_at so the edit forms re-initialise from the saved values after each write.
  const version = `${user.id}-${user.updated_at}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <UserStatusBadge status={user.status} deleted={deleted} />
            {isSelf(user) && <span className="text-sm text-muted-foreground">(you)</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <ResetPasswordDialog user={user} />}
          <UserLifecycleActions user={user} onChanged={setUser} onDeleted={() => router.push("/admin/users")} />
        </div>
      </div>

      {!modifiable && (
        <Alert>
          <AlertTitle>View only</AlertTitle>
          <AlertDescription>Only a super-admin can modify admin and super-admin accounts.</AlertDescription>
        </Alert>
      )}
      {deleted && modifiable && (
        <Alert>
          <AlertTitle>This account is deleted</AlertTitle>
          <AlertDescription>Restore it to make changes or let the user sign in again.</AlertDescription>
        </Alert>
      )}
      {user.status === "suspended" && !deleted && (
        <Alert variant="destructive">
          <AlertTitle>This account is suspended</AlertTitle>
          <AlertDescription>The user can&apos;t sign in, and any existing sessions are blocked.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProfileSection key={`profile-${version}`} user={user} canEdit={canEdit} onSaved={setUser} />
          <AccessSection key={`access-${version}`} user={user} canEdit={canEdit} onSaved={setUser} />
          <EnrollmentsSection user={user} />
          <NotesSection
            user={user}
            onNotesChange={(update) =>
              setUser((current) => (current ? { ...current, notes: update(current.notes ?? []) } : current))
            }
          />
        </div>
        <div className="flex flex-col gap-6">
          <MetaSection user={user} />
          <TagsSection user={user} canEdit={canEdit} onSaved={setUser} />
        </div>
      </div>
    </div>
  );
}

export default function AdminUserPage() {
  return (
    <RequirePermission permission="manage-users">
      <div className="flex flex-col gap-6">
        <Link
          href="/admin/users"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All users
        </Link>
        <UserDetail />
      </div>
    </RequirePermission>
  );
}
