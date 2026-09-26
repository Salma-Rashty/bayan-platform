import { Badge } from "@/components/ui/badge";
import type { CourseApplicationStatus, EnrollmentStatus } from "@/lib/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const APPLICATION_VARIANTS: Record<CourseApplicationStatus, BadgeVariant> = {
  pending: "outline",
  reviewing: "secondary",
  accepted: "default",
  rejected: "destructive",
};

const ENROLLMENT_VARIANTS: Record<EnrollmentStatus, BadgeVariant> = {
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export function ApplicationStatusBadge({ status }: { status: CourseApplicationStatus }) {
  return (
    <Badge variant={APPLICATION_VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  );
}

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <Badge variant={ENROLLMENT_VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  );
}
