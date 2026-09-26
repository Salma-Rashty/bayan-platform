"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  PageHeader,
  RequirePermission,
  TableSkeleton,
  TruncatedNotice,
} from "@/components/admin/admin-ui";
import { RecentlyDeleted, useSessionTrash } from "@/components/admin/session-trash";
import { UserDialog } from "@/components/admin/user-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { ALL_ROLES, type Role, type User } from "@/lib/types";
import { paginateLocally, useAllPages } from "@/lib/use-all-pages";

type RoleFilter = Role | "all";

function UsersManager() {
  const { user: currentUser } = useAuth();
  const { items, setItems, total, truncated, loading, error, reload } = useAllPages<User>("/users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);

  const trash = useSessionTrash<User>({
    basePath: "/users",
    noun: "user",
    nameOf: (user) => user.name,
    onDeleted: (user) => setItems((current) => current?.filter((entry) => entry.id !== user.id) ?? null),
    onRestored: reload,
  });

  const query = search.trim().toLowerCase();
  const matchesSearch = (user: User) =>
    !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  const searched = (items ?? []).filter(matchesSearch);
  const filtered = roleFilter === "all" ? searched : searched.filter((user) => user.roles.includes(roleFilter));
  const { pageItems, meta } = paginateLocally(filtered, page);

  const roleOptions = [
    { value: "all" as RoleFilter, label: "All", count: searched.length },
    ...ALL_ROLES.map((role) => ({
      value: role as RoleFilter,
      label: role,
      count: searched.filter((user) => user.roles.includes(role)).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage accounts, roles and permissions."
        actions={
          <UserDialog
            trigger={
              <Button>
                <PlusIcon data-icon="inline-start" />
                New user
              </Button>
            }
            onSaved={reload}
          />
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or email"
            aria-label="Search users"
            className="pl-8"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <FilterTabs
          label="Filter by role"
          options={roleOptions}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        />
      </div>

      {truncated && items && <TruncatedNotice loaded={items.length} total={total} />}

      {loading && !items ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError title="Couldn't load users" error={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState>{items?.length ? "No users match these filters." : "No users yet."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">
                        {user.name}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            user.roles.map((role) => (
                              <Badge key={role} variant={role === "student" ? "outline" : "secondary"}>
                                {role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(user.created_at) ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <UserDialog
                            user={user}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${user.name}`}>
                                <PencilIcon />
                              </Button>
                            }
                            onSaved={reload}
                          />
                          {/* Deleting yourself would end your own session mid-action. */}
                          {!isSelf && (
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${user.name}`}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2Icon />
                                </Button>
                              }
                              title="Delete user?"
                              description={
                                <>
                                  {user.name} ({user.email}) will be soft-deleted and can no longer sign in. You can
                                  restore the account afterwards.
                                </>
                              }
                              confirmLabel="Delete"
                              pendingLabel="Deleting..."
                              destructive
                              onConfirm={() => trash.remove(user)}
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
          <PaginationControls meta={meta} onPageChange={setPage} />
        </div>
      )}

      <RecentlyDeleted
        trash={trash}
        renderLabel={(user) => (
          <>
            <span className="font-medium text-foreground">{user.name}</span>{" "}
            <span className="text-muted-foreground">{user.email}</span>
          </>
        )}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="manage-users">
      <UsersManager />
    </RequirePermission>
  );
}
