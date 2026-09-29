import { useAuth } from "@/lib/auth-context";
import type { Permission, Role } from "@/lib/types";

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  /** Permission the API requires for this section's endpoints. */
  permission?: Permission;
  /** Role the API requires instead, for sections gated by role rather than permission. */
  role?: Role;
  /** Nav group label; sections sharing one are nested under a collapsible entry. */
  group?: string;
}

/** A top-level admin nav entry: a plain link, or a collapsible group of links (no page of its own). */
export type AdminNavEntry =
  | { kind: "link"; section: AdminSection }
  | { kind: "group"; label: string; sections: AdminSection[] };

const USER_MANAGEMENT = "User Management";

/** Admin areas, in nav order. Each is shown only to users holding its permission/role. */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Search, tag and manage accounts, roles, access and notes.",
    permission: "manage-users",
    group: USER_MANAGEMENT,
  },
  {
    href: "/admin/courses",
    label: "Courses",
    description: "Create, publish and organise courses and their lessons.",
    permission: "edit-curriculum",
  },
  {
    href: "/admin/applications",
    label: "Course applications",
    description: "Review student applications and enroll accepted students.",
    permission: "manage-users",
  },
  {
    href: "/admin/teacher-applications",
    label: "Teacher applications",
    description: "Review applicants and grant the teacher role.",
    permission: "manage-users",
  },
  {
    href: "/admin/enrollments",
    label: "Enrollments",
    description: "See which students are enrolled in which courses.",
    permission: "manage-users",
  },
  {
    href: "/admin/roles",
    label: "Roles",
    description: "Define roles and what each one is allowed to do.",
    role: "super-admin",
    group: USER_MANAGEMENT,
  },
];

/** The admin sections the current user can open. */
export function useAdminSections(): AdminSection[] {
  const { hasPermission, hasRole } = useAuth();

  return ADMIN_SECTIONS.filter(
    (section) =>
      (!section.permission || hasPermission(section.permission)) && (!section.role || hasRole(section.role))
  );
}

/**
 * The current user's admin sections as nav entries. A group appears where its first visible
 * section would, holding only the sections the user can open, and is dropped if it has none.
 */
export function useAdminNav(): AdminNavEntry[] {
  const entries: AdminNavEntry[] = [];

  for (const section of useAdminSections()) {
    if (!section.group) {
      entries.push({ kind: "link", section });
      continue;
    }

    const group = entries.find((entry) => entry.kind === "group" && entry.label === section.group);
    if (group?.kind === "group") {
      group.sections.push(section);
    } else {
      entries.push({ kind: "group", label: section.group, sections: [section] });
    }
  }

  return entries;
}
