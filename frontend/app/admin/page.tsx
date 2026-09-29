"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/admin-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSections } from "@/lib/admin-sections";
import { useAuth } from "@/lib/auth-context";
import type { Course, CourseApplication, Paginated, TeacherApplication, User } from "@/lib/types";
import { useAllPages } from "@/lib/use-all-pages";
import { useApiGet } from "@/lib/use-api-get";

interface StatCardProps {
  label: string;
  value: number | null;
  loading: boolean;
  error: string | null;
  detail?: string;
  href?: string;
}

function StatCard({ label, value, loading, error, detail, href }: StatCardProps) {
  const content = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : error ? (
          <p className="text-sm text-destructive">Couldn&apos;t load</p>
        ) : (
          <CardTitle className="text-3xl font-semibold tabular-nums">{value ?? "—"}</CardTitle>
        )}
      </CardHeader>
      {detail && !loading && !error && (
        <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function UsersStat() {
  const { data, loading, error } = useApiGet<Paginated<User>>("/users");
  return (
    <StatCard label="Users" value={data?.meta.total ?? null} loading={loading} error={error} href="/admin/users" />
  );
}

function CoursesStat({ linkable }: { linkable: boolean }) {
  const { data, loading, error } = useApiGet<Paginated<Course>>("/courses");
  return (
    <StatCard
      label="Courses"
      value={data?.meta.total ?? null}
      loading={loading}
      error={error}
      href={linkable ? "/admin/courses" : undefined}
    />
  );
}

/** The list endpoints can't filter by status, so pending counts are tallied from every page. */
function PendingStat<T extends { id: number; status: string }>({
  label,
  path,
  href,
}: {
  label: string;
  path: string;
  href: string;
}) {
  const { items, loading, error, truncated } = useAllPages<T>(path);
  const pending = items?.filter((item) => item.status === "pending").length ?? null;
  const reviewing = items?.filter((item) => item.status === "reviewing").length ?? 0;

  const detailParts = [reviewing > 0 && `${reviewing} in review`, truncated && "recent records only"].filter(Boolean);

  return (
    <StatCard
      label={label}
      value={pending}
      loading={loading}
      error={error}
      detail={detailParts.length ? detailParts.join(" · ") : undefined}
      href={href}
    />
  );
}

export default function AdminDashboardPage() {
  const { hasPermission } = useAuth();
  const canManageUsers = hasPermission("manage-users");
  const canEditCurriculum = hasPermission("edit-curriculum");
  const sections = useAdminSections();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Admin" description="Manage people, courses and applications." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canManageUsers && <UsersStat />}
        <CoursesStat linkable={canEditCurriculum} />
        {canManageUsers && (
          <>
            <PendingStat<CourseApplication>
              label="Pending course applications"
              path="/course-applications"
              href="/admin/applications"
            />
            <PendingStat<TeacherApplication>
              label="Pending teacher applications"
              path="/teacher-applications"
              href="/admin/teacher-applications"
            />
          </>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sections</h2>
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your account doesn&apos;t have any admin permissions yet. Ask a super-admin to grant them.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Link key={section.href} href={section.href} className="group block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {section.label}
                      <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
