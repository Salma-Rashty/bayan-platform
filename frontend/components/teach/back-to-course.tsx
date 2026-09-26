"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import type { Lesson } from "@/lib/types";
import { useApiGet } from "@/lib/use-api-get";

/**
 * Assignments and quizzes only carry a `lesson_id`, so this looks up the lesson to link back
 * to its course's manage page, falling back to the teach dashboard.
 */
export function BackToCourse({ lessonId }: { lessonId: number }) {
  const { data: lesson } = useApiGet<Lesson>(`/lessons/${lessonId}`);

  return (
    <Link
      href={lesson ? `/teach/courses/${lesson.course_id}` : "/teach"}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      {lesson ? `Back to course · ${lesson.title}` : "Back to courses"}
    </Link>
  );
}
