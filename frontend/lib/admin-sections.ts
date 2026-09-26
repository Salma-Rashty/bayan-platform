import type { Permission } from "@/lib/types";

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  /** Permission the API requires for this section's endpoints. */
  permission: Permission;
}

/** Admin areas, in nav order. Each is shown only to users holding its permission. */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Create accounts and manage roles and permissions.",
    permission: "manage-users",
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
];
