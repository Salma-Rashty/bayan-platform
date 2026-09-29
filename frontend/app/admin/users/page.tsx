"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, EyeIcon, PlusIcon, SearchIcon } from "lucide-react";

import {
  EmptyState,
  FilterTabs,
  LoadError,
  NativeSelect,
  PageHeader,
  RequirePermission,
  TableSkeleton,
} from "@/components/admin/admin-ui";
import { CountrySelect } from "@/components/admin/country-select";
import { RoleBadges, TagList, UserStatusBadge } from "@/components/admin/user-badges";
import { UserLifecycleActions } from "@/components/admin/user-lifecycle-actions";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Paginated, Tag, User } from "@/lib/types";
import { useAccessOptions } from "@/lib/use-access-options";
import { useApiGet } from "@/lib/use-api-get";
import { useUserAccess } from "@/lib/user-access";

type SortColumn = "name" | "email" | "status" | "created_at" | "last_login_at";
type Direction = "asc" | "desc";
type TrashedFilter = "current" | "only" | "with";

const TRASHED_OPTIONS: { value: TrashedFilter; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "only", label: "Deleted" },
  { value: "with", label: "All" },
];

function SortableHead({
  column,
  label,
  sort,
  direction,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: SortColumn;
  direction: Direction;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort === column;
  const Icon = !active ? ArrowUpDownIcon : direction === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="-ml-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {label}
        <Icon className={active ? "size-3.5" : "size-3.5 text-muted-foreground/60"} />
      </button>
    </TableHead>
  );
}

function UsersManager() {
  const { isSelf } = useUserAccess();
  const { roles: roleOptions } = useAccessOptions();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [country, setCountry] = useState("");
  const [trashed, setTrashed] = useState<TrashedFilter>("current");
  const [sort, setSort] = useState<SortColumn>("created_at");
  const [direction, setDirection] = useState<Direction>("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const params = new URLSearchParams({ sort, direction, page: String(page) });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (tag) params.set("tag", tag);
  if (country) params.set("country", country);
  if (trashed !== "current") params.set("trashed", trashed);

  const { data, loading, error, reload } = useApiGet<Paginated<User>>(`/users?${params}`);
  const { data: tags } = useApiGet<Tag[]>("/tags");

  const filtersActive = Boolean(debouncedSearch || role || status || tag || country || trashed !== "current");

  function updateFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  function handleSort(column: SortColumn) {
    if (column === sort) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSort(column);
      // Dates read most naturally newest-first; text columns A→Z.
      setDirection(column === "created_at" || column === "last_login_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRole("");
    setStatus("");
    setTag("");
    setCountry("");
    setTrashed("current");
    setPage(1);
  }

  const sortProps = { sort, direction, onSort: handleSort };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Search, tag and manage accounts, roles and access."
        actions={
          <Button render={<Link href="/admin/users/new" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            New user
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name or email"
              aria-label="Search users"
              className="pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <FilterTabs
            label="Show deleted users"
            options={TRASHED_OPTIONS}
            value={trashed}
            onChange={(value) => {
              setTrashed(value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="Filter by role" value={role} onChange={(e) => updateFilter(setRole)(e.target.value)}>
            <option value="">All roles</option>
            {roleOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by status"
            value={status}
            onChange={(e) => updateFilter(setStatus)(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </NativeSelect>
          <NativeSelect aria-label="Filter by tag" value={tag} onChange={(e) => updateFilter(setTag)(e.target.value)}>
            <option value="">All tags</option>
            {(tags ?? []).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </NativeSelect>
          <CountrySelect
            aria-label="Filter by country"
            emptyLabel="All countries"
            className="max-w-48"
            value={country}
            onChange={updateFilter(setCountry)}
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Skeleton only on first load; later filter changes keep the stale rows until the new page arrives. */}
      {loading && !data ? (
        <TableSkeleton />
      ) : error ? (
        <LoadError title="Couldn't load users" error={error} onRetry={reload} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState>{filtersActive ? "No users match these filters." : "No users yet."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className={loading ? "py-0 opacity-60 transition-opacity" : "py-0 transition-opacity"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="name" label="Name" {...sortProps} />
                  <SortableHead column="status" label="Status" {...sortProps} />
                  <TableHead>Roles</TableHead>
                  <TableHead>Tags</TableHead>
                  <SortableHead column="last_login_at" label="Last login" {...sortProps} />
                  <SortableHead column="created_at" label="Joined" {...sortProps} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/admin/users/${user.id}`} className="font-medium text-foreground hover:underline">
                        {user.name}
                      </Link>
                      {isSelf(user) && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} deleted={Boolean(user.deleted_at)} />
                    </TableCell>
                    <TableCell>
                      <RoleBadges roles={user.roles} />
                    </TableCell>
                    <TableCell>
                      <TagList tags={user.tags ?? []} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(user.last_login_at) ?? "Never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.created_at) ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`View ${user.name}`}
                          title="View"
                          render={<Link href={`/admin/users/${user.id}`} />}
                          nativeButton={false}
                        >
                          <EyeIcon />
                        </Button>
                        <UserLifecycleActions user={user} compact onChanged={reload} onDeleted={reload} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <PaginationControls meta={data.meta} onPageChange={setPage} />
        </div>
      )}
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
