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

export interface TeacherApplication {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  qualifications: string | null;
  cv_path: string | null;
  status: CourseApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
