/** Roles the code depends on; they can't be renamed or deleted. */
export type SystemRole = "super-admin" | "admin" | "teacher" | "student";
/** Any role name: super-admins can create custom roles at runtime. `string & {}` keeps autocomplete. */
export type Role = SystemRole | (string & {});

/** Roles that get the teacher-facing screens (the API treats all three as staff). */
export const STAFF_ROLES: Role[] = ["super-admin", "admin", "teacher"];

/** Roles that get the /admin screens. */
export const ADMIN_ROLES: Role[] = ["super-admin", "admin"];

/** Permissions the code checks (see AccessCatalog on the API). */
export type SystemPermission =
  | "manage-users"
  | "edit-curriculum"
  | "manage-catalog"
  | "create-lessons"
  | "grade-homework"
  | "manage-billing"
  | "view-reports";
/** Any permission name. Permissions are defined in code; this stays open so a new one needn't break types. */
export type Permission = SystemPermission | (string & {});

/**
 * The seeded roles/permissions, mirroring RolesAndPermissionsSeeder. Only a fallback: the user
 * screens load the live lists (including custom ones) from GET /users/access-options.
 */
export const ALL_ROLES: Role[] = ["super-admin", "admin", "teacher", "student"];
export const ALL_PERMISSIONS: Permission[] = [
  "manage-users",
  "edit-curriculum",
  "manage-catalog",
  "create-lessons",
  "grade-homework",
  "manage-billing",
  "view-reports",
];

/** A role as managed on /admin/roles (GET /roles). */
export interface AccessRole {
  id: number;
  name: Role;
  /** System roles can't be renamed or deleted. */
  is_system: boolean;
  /** super-admin: always has every permission; nothing about it can be edited. */
  is_locked: boolean;
  permissions: Permission[];
  permissions_count: number;
  /** Non-deleted users holding the role. */
  users_count: number;
  created_at: string;
  updated_at: string;
}

/** Display metadata for a permission (from AccessCatalog on the API). */
export interface PermissionInfo {
  name: Permission;
  label: string;
  group: string;
  description: string | null;
  /** False when no feature checks this permission yet, so granting it does nothing. */
  wired: boolean;
}

/** A permission from GET /permissions (read-only; permissions are defined in code). */
export interface AccessPermission extends PermissionInfo {
  id: number;
}

/** GET /users/access-options: what the user screens can assign. */
export interface AccessOptions {
  roles: Role[];
  permissions: PermissionInfo[];
  /** Roles bundling an elevated permission; only a super-admin may grant or remove them. */
  elevated_roles: Role[];
}

export type UserStatus = "active" | "suspended";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  status?: UserStatus;
  roles: Role[];
  /** Effective permissions: direct grants and those inherited from roles, merged. */
  permissions?: Permission[];
  /** Permissions granted to the user directly (not through a role). */
  direct_permissions?: Permission[];
  /** Present on the /users endpoints. */
  tags?: Tag[];
  /** Only on GET /users/{id} and the user write endpoints. */
  enrollments?: Enrollment[];
  /** Only on GET /users/{id} and the user write endpoints; newest first. */
  notes?: UserNote[];
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Tag {
  id: number;
  name: string;
  /** Hex colour, e.g. "#3b82f6". */
  color: string | null;
  /** Only on GET /tags. */
  users_count?: number;
}

/** An internal note an admin wrote about a user. */
export interface UserNote {
  id: number;
  user_id: number;
  author_id: number;
  author?: { id: number; name: string } | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/** Shape of a paginated Laravel API response (`->paginate()` + a Resource collection). */
export interface Paginated<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/** A course category (GET /categories). Not yet linked to courses. */
export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  order: number;
  /** Non-deleted levels in the category. */
  levels_count: number;
  /** Non-deleted levels whose own is_active is off (whatever the category's state). */
  inactive_levels_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A level within a category (GET /levels). Names are unique per category. */
export interface Level {
  id: number;
  category_id: number;
  /** Summary of the category; included even when the category is deleted. */
  category?: Pick<Category, "id" | "name" | "is_active" | "deleted_at"> | null;
  name: string;
  description: string | null;
  /** The level's own setting; switching its category off never changes it. */
  is_active: boolean;
  /** Whether it's actually available: its own setting AND an active, non-deleted category. */
  is_effectively_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CourseType = "arabic" | "quran";

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  type: CourseType;
  level: string | null;
  price: string;
  starts_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  is_published: boolean;
  lessons?: Lesson[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order: number;
  materials?: Material[];
  assignments?: Assignment[];
  quizzes?: Quiz[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Material {
  id: number;
  lesson_id: number;
  title: string;
  file_path: string;
  type: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CourseApplicationStatus = "pending" | "reviewing" | "accepted" | "rejected";

export interface CourseApplication {
  id: number;
  user_id: number;
  course_id: number;
  user?: User;
  course?: Course;
  status: CourseApplicationStatus;
  meeting_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type TeacherApplicationStatus = "pending" | "reviewing" | "interview" | "accepted" | "rejected";

export type Gender = "male" | "female";

export type AgeGroup = "children" | "teenagers" | "adults" | "elderly";

/** A summary of a catalog row as recorded on an application (may since have been deleted). */
export interface CatalogSummary {
  id: number;
  name: string;
  deleted_at: string | null;
}

/** One chosen category, reassembled from the application's selection tables. */
export interface TeacherApplicationSelection {
  category: CatalogSummary | null;
  /** Chosen levels with their age groups (when the category has levels). */
  levels: { level: CatalogSummary | null; age_groups: AgeGroup[] }[];
  /** Age groups for the category itself (when it has no levels). */
  age_groups: AgeGroup[];
}

export interface TeacherApplicationFile {
  /** Download name, e.g. "amina-hassan-cv.pdf". */
  name: string;
  mime_type: string;
  size: number | null;
  /** Whether it can be viewed in the browser (PDF CVs; videos, format permitting). */
  previewable: boolean;
}

/** A user as shown on a teacher application (loaded even if since deleted). */
export interface ApplicationUserSummary {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  deleted_at: string | null;
}

/** Admin detail only: the applicant's other applications and the reapplication cooldown. */
export interface TeacherApplicationHistory {
  /** Other applications by the same applicant: same account and/or same name + birth date. */
  matches: {
    id: number;
    name: string;
    email: string;
    status: TeacherApplicationStatus;
    created_at: string;
    same_account: boolean;
    same_identity: boolean;
  }[];
  cooldown_months: number;
  /** The application the cooldown counts from. */
  latest_application_id: number | null;
  /** When they may apply again; null if they may apply now. */
  next_allowed_at: string | null;
  cooldown_lifted_at: string | null;
  cooldown_lifted_by: string | null;
}

export interface TeacherApplication {
  id: number;
  /** The applicant's account; null for older anonymous applications or an admin's for someone without one. */
  user_id?: number | null;
  user?: ApplicationUserSummary | null;
  /** Who submitted it: the applicant, or an admin on their behalf. */
  submitted_by?: ApplicationUserSummary | null;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  /** E.164, e.g. +905551234567 (applications from before per-country validation may differ). */
  phone: string | null;
  /** ISO 3166-1 alpha-2 code the phone was validated against. */
  phone_country: string | null;
  /** The phone in readable international form, e.g. "+90 555 123 45 67". */
  phone_display: string | null;
  /** ISO 3166-1 alpha-2 code. */
  nationality: string;
  nationality_name: string;
  birth_date: string;
  gender: Gender;
  about: string;
  status: TeacherApplicationStatus;
  /** Statuses this application can move to next. */
  allowed_transitions: TeacherApplicationStatus[];
  notes: string | null;
  /** Detail view only. Files are opened through links minted on demand (see application-file-viewer). */
  files?: { cv: TeacherApplicationFile | null; video: TeacherApplicationFile | null };
  /** Detail view only. */
  selections?: TeacherApplicationSelection[];
  /** Admin detail only. */
  history?: TeacherApplicationHistory;
  /** List view: names of the chosen categories. */
  category_names?: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** GET /my/teacher-applications: the signed-in user's own applications (read-only) and cooldown. */
export interface MyTeacherApplications {
  /** Newest first; applicant-safe fields only (no notes, review controls or history). */
  data: TeacherApplication[];
  can_apply: boolean;
  /** When they may apply again; null if they may apply now. */
  next_allowed_at: string | null;
  /** Admins: never in cooldown, may apply on others' behalf. */
  cooldown_exempt: boolean;
  cooldown_months: number;
}

/** GET /public/catalog: effectively-active categories with their effectively-active levels. */
export interface PublicCatalogCategory {
  id: number;
  name: string;
  description: string | null;
  has_levels: boolean;
  levels: { id: number; name: string; description: string | null }[];
}

/**
 * GET /public/catalog/teacher-application: every category and level, inactive included
 * (applicants may choose either), with their own is_active.
 */
export interface TeacherApplicationCatalogCategory extends Omit<PublicCatalogCategory, "levels"> {
  is_active: boolean;
  levels: (PublicCatalogCategory["levels"][number] & { is_active: boolean })[];
}

export type EnrollmentStatus = "active" | "completed" | "cancelled";

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  user?: User;
  course?: Course;
  status: EnrollmentStatus;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Assignment {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  max_grade: string;
  submissions?: Submission[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Submission {
  id: number;
  assignment_id: number;
  user_id: number;
  user?: User;
  content: string | null;
  file_path: string | null;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  questions?: Question[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type QuestionType = "single" | "multiple";

export interface Question {
  id: number;
  quiz_id: number;
  body: string;
  type: QuestionType;
  order: number;
  options?: QuestionOption[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuestionOption {
  id: number;
  question_id: number;
  body: string;
  /** Only present in the response for curriculum staff (edit-curriculum permission). */
  is_correct?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  user_id: number;
  user?: User;
  score: string | null;
  answers: Record<string, number[]>;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
