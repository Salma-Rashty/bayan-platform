"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheckIcon, ListChecksIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { AssignmentDialog } from "@/components/teach/assignment-dialog";
import { ConfirmDeleteDialog } from "@/components/teach/confirm-delete-dialog";
import { LessonDialog } from "@/components/teach/lesson-dialog";
import { MaterialDialog } from "@/components/teach/material-dialog";
import { QuizDialog } from "@/components/teach/quiz-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Lesson } from "@/lib/types";

interface LessonPanelProps {
  lesson: Lesson;
  /** Whether the user has edit-curriculum; without it the panel is read-only. */
  canEdit: boolean;
  onChanged: () => void;
}

// These are passed to dialogs as `trigger` elements, which the dialog clones with its own
// props (onClick, ref, aria-*), so they must forward everything to the underlying Button.
type TriggerButtonProps = ComponentProps<typeof Button> & { label: string };

function EditButton({ label, ...props }: TriggerButtonProps) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
      <PencilIcon />
    </Button>
  );
}

function DeleteButton({ label, ...props }: TriggerButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className="text-destructive hover:text-destructive"
      {...props}
    >
      <Trash2Icon />
    </Button>
  );
}

function AddButton({ label, ...props }: TriggerButtonProps) {
  return (
    <Button variant="outline" size="sm" {...props}>
      <PlusIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function LessonPanel({ lesson, canEdit, onChanged }: LessonPanelProps) {
  const materials = lesson.materials ?? [];
  const assignments = lesson.assignments ?? [];
  const quizzes = lesson.quizzes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="mr-2 text-muted-foreground">{lesson.order}.</span>
          {lesson.title}
        </CardTitle>
        {lesson.description && <CardDescription>{lesson.description}</CardDescription>}
        {canEdit && (
          <CardAction className="flex items-center gap-1">
            <LessonDialog
              courseId={lesson.course_id}
              lesson={lesson}
              trigger={<EditButton label={`Edit lesson ${lesson.title}`} />}
              onSaved={onChanged}
            />
            <ConfirmDeleteDialog
              noun="lesson"
              name={lesson.title}
              path={`/lessons/${lesson.id}`}
              trigger={<DeleteButton label={`Delete lesson ${lesson.title}`} />}
              onDeleted={onChanged}
            />
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <Section
          title="Materials"
          action={
            canEdit && (
              <MaterialDialog lessonId={lesson.id} trigger={<AddButton label="Add material" />} onSaved={onChanged} />
            )
          }
        >
          {materials.length === 0 ? (
            <Empty>No materials yet.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {materials.map((material) => (
                <Row
                  key={material.id}
                  actions={
                    canEdit && (
                      <>
                        <MaterialDialog
                          lessonId={lesson.id}
                          material={material}
                          trigger={<EditButton label={`Edit material ${material.title}`} />}
                          onSaved={onChanged}
                        />
                        <ConfirmDeleteDialog
                          noun="material"
                          name={material.title}
                          path={`/materials/${material.id}`}
                          trigger={<DeleteButton label={`Delete material ${material.title}`} />}
                          onDeleted={onChanged}
                        />
                      </>
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <a
                      href={material.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {material.title}
                    </a>
                    {material.type && (
                      <Badge variant="outline" className="shrink-0">
                        {material.type}
                      </Badge>
                    )}
                  </div>
                </Row>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Assignments"
          action={
            canEdit && (
              <AssignmentDialog
                lessonId={lesson.id}
                trigger={<AddButton label="New assignment" />}
                onSaved={onChanged}
              />
            )
          }
        >
          {assignments.length === 0 ? (
            <Empty>No assignments yet.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {assignments.map((assignment) => (
                <Row
                  key={assignment.id}
                  actions={
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/teach/assignments/${assignment.id}/submissions`} />}
                      >
                        <ClipboardCheckIcon data-icon="inline-start" />
                        Submissions
                      </Button>
                      {canEdit && (
                        <>
                          <AssignmentDialog
                            lessonId={lesson.id}
                            assignment={assignment}
                            trigger={<EditButton label={`Edit assignment ${assignment.title}`} />}
                            onSaved={onChanged}
                          />
                          <ConfirmDeleteDialog
                            noun="assignment"
                            name={assignment.title}
                            path={`/assignments/${assignment.id}`}
                            trigger={<DeleteButton label={`Delete assignment ${assignment.title}`} />}
                            onDeleted={onChanged}
                          />
                        </>
                      )}
                    </>
                  }
                >
                  <p className="truncate text-sm font-medium text-foreground">{assignment.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.due_at && <>Due {formatDateTime(assignment.due_at)} &middot; </>}
                    Max grade: {formatNumber(assignment.max_grade)}
                  </p>
                </Row>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Quizzes"
          action={
            canEdit && <QuizDialog lessonId={lesson.id} trigger={<AddButton label="New quiz" />} onSaved={onChanged} />
          }
        >
          {quizzes.length === 0 ? (
            <Empty>No quizzes yet.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {quizzes.map((quiz) => (
                <Row
                  key={quiz.id}
                  actions={
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/teach/quizzes/${quiz.id}/attempts`} />}
                      >
                        <ListChecksIcon data-icon="inline-start" />
                        Results
                      </Button>
                      {canEdit && (
                        <>
                          <QuizDialog
                            lessonId={lesson.id}
                            quiz={quiz}
                            trigger={<EditButton label={`Edit quiz ${quiz.title}`} />}
                            onSaved={onChanged}
                          />
                          <ConfirmDeleteDialog
                            noun="quiz"
                            name={quiz.title}
                            path={`/quizzes/${quiz.id}`}
                            trigger={<DeleteButton label={`Delete quiz ${quiz.title}`} />}
                            onDeleted={onChanged}
                          />
                        </>
                      )}
                    </>
                  }
                >
                  <p className="truncate text-sm font-medium text-foreground">{quiz.title}</p>
                  {quiz.description && <p className="truncate text-xs text-muted-foreground">{quiz.description}</p>}
                </Row>
              ))}
            </ul>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
