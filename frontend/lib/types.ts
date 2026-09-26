export type Role = "super-admin" | "admin" | "teacher" | "student";

/** Roles that get the teacher-facing screens (the API treats all three as staff). */
export const STAFF_ROLES: Role[] = ["super-admin", "admin", "teacher"];

/** Roles that get the /admin screens. */
export const ADMIN_ROLES: Role[] = ["super-admin", "admin"];

export type Permission =
  | "manage-users"
  | "edit-curriculum"
  | "create-lessons"
  | "grade-homework"
  | "manage-billing"
  | "view-reports";

// TODO(api): there's no endpoint listing the available roles/permissions, so these mirror
// RolesAndPermissionsSeeder. Replace with a fetched list once one exists (e.g. GET /roles).
export const ALL_ROLES: Role[] = ["super-admin", "admin", "teacher", "student"];
export const ALL_PERMISSIONS: Permission[] = [
  "manage-users",
  "edit-curriculum",
  "create-lessons",
  "grade-homework",
  "manage-billing",
  "view-reports",
];

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  /** Effective permissions: direct grants and those inherited from roles, merged. */
  permissions?: Permission[];
  created_at?: string;
  deleted_at?: string | null;
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
