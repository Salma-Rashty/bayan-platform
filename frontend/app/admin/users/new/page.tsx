"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, RequirePermission } from "@/components/admin/admin-ui";
import { CheckboxList } from "@/components/admin/checkbox-list";
import { CountrySelect } from "@/components/admin/country-select";
import { TagPicker } from "@/components/admin/tag-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { Permission, Role, Tag, User } from "@/lib/types";
import { useAccessOptions } from "@/lib/use-access-options";
import { useApiGet } from "@/lib/use-api-get";
import { PERMISSION_LIMITS_HINT, useUserAccess } from "@/lib/user-access";

function CreateUserForm() {
  const router = useRouter();
  const { isSuperAdmin, canAssignRole, canAssignPermission } = useUserAccess();
  const accessOptions = useAccessOptions();
  const { data: allTags, setData: setAllTags } = useApiGet<Tag[]>("/tags");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roles, setRoles] = useState<Role[]>(["student"]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fieldError = (field: string) => error?.fieldError(field);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await api.post<User>("/users", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country || null,
        password,
        password_confirmation: passwordConfirmation,
        roles,
        permissions,
        tags: tags.map((tag) => tag.id),
      });
      toast.success(`Created ${user.name}.`);
      router.push(`/admin/users/${user.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(err);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not create this user.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!fieldError("name") || undefined}>
                    <FieldLabel htmlFor="new-user-name">Name</FieldLabel>
                    <Input id="new-user-name" value={name} onChange={(e) => setName(e.target.value)} required />
                    <FieldError>{fieldError("name")}</FieldError>
                  </Field>
                  <Field data-invalid={!!fieldError("email") || undefined}>
                    <FieldLabel htmlFor="new-user-email">Email</FieldLabel>
                    <Input
                      id="new-user-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <FieldError>{fieldError("email")}</FieldError>
                  </Field>
                  <Field data-invalid={!!fieldError("phone") || undefined}>
                    <FieldLabel htmlFor="new-user-phone">Phone</FieldLabel>
                    <Input
                      id="new-user-phone"
                      type="tel"
                      maxLength={30}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <FieldError>{fieldError("phone")}</FieldError>
                  </Field>
                  <Field data-invalid={!!fieldError("country") || undefined}>
                    <FieldLabel htmlFor="new-user-country">Country</FieldLabel>
                    <CountrySelect
                      id="new-user-country"
                      className="w-full"
                      emptyLabel="Not set"
                      value={country}
                      onChange={setCountry}
                    />
                    <FieldError>{fieldError("country")}</FieldError>
                  </Field>
                  <Field data-invalid={!!fieldError("password") || undefined}>
                    <FieldLabel htmlFor="new-user-password">Password</FieldLabel>
                    <Input
                      id="new-user-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <FieldError>{fieldError("password")}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-user-password-confirmation">Confirm password</FieldLabel>
                    <Input
                      id="new-user-password-confirmation"
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      required
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access</CardTitle>
              <CardDescription>Roles grant bundles of permissions; direct permissions add to them.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <Field data-invalid={!!fieldError("roles") || undefined}>
                <FieldLabel>Roles</FieldLabel>
                <CheckboxList
                  idPrefix="new-user-role"
                  options={accessOptions.roles}
                  value={roles}
                  onChange={setRoles}
                  isDisabled={(role) => !canAssignRole(role, accessOptions.elevatedRoles)}
                />
                <FieldError>{fieldError("roles") ?? fieldError("roles.0")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("permissions") || undefined}>
                <FieldLabel>Direct permissions</FieldLabel>
                <CheckboxList
                  idPrefix="new-user-permission"
                  options={accessOptions.permissions}
                  value={permissions}
                  onChange={setPermissions}
                  isDisabled={(permission) => !canAssignPermission(permission)}
                />
                {!isSuperAdmin && <FieldDescription>{PERMISSION_LIMITS_HINT}</FieldDescription>}
                <FieldError>{fieldError("permissions") ?? fieldError("permissions.0")}</FieldError>
              </Field>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Group users for filtering, e.g. &ldquo;VIP&rdquo; or &ldquo;Evening class&rdquo;.</CardDescription>
          </CardHeader>
          <CardContent>
            <TagPicker
              allTags={allTags ?? []}
              value={tags}
              onChange={setTags}
              onTagCreated={(tag) => setAllTags((current) => [...(current ?? []), tag])}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={submitting} render={<Link href="/admin/users" />} nativeButton={false}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create user"}
        </Button>
      </div>
    </form>
  );
}

export default function NewUserPage() {
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
        <PageHeader title="New user" description="Create an account and set its access up front." />
        <CreateUserForm />
      </div>
    </RequirePermission>
  );
}
