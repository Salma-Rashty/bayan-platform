"use client";

import { useState, type ReactElement } from "react";

import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Course, CourseType } from "@/lib/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Course dates are date-only; the API serializes them as full ISO datetimes. */
const toDateValue = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

interface CourseDialogProps {
  /** Omit to create a new course. */
  course?: Course;
  trigger: ReactElement;
  onSaved: () => void;
}

export function CourseDialog({ course, trigger, onSaved }: CourseDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  // On create, the slug follows the title until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(false);
  const [type, setType] = useState<CourseType>("arabic");
  const [level, setLevel] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setTitle(course?.title ?? "");
    setSlug(course?.slug ?? "");
    setSlugTouched(Boolean(course));
    setType(course?.type ?? "arabic");
    setLevel(course?.level ?? "");
    setPrice(course ? String(Number(course.price)) : "");
    setDescription(course?.description ?? "");
    setStartsAt(toDateValue(course?.starts_at));
    setOpensAt(toDateValue(course?.registration_opens_at));
    setClosesAt(toDateValue(course?.registration_closes_at));
    setIsPublished(course?.is_published ?? false);
  });

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit() {
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      type,
      level: level.trim() || null,
      description: description.trim() || null,
      // `price` is NOT NULL (defaults to 0), so leave it out rather than sending null.
      ...(price.trim() !== "" && { price: Number(price) }),
      starts_at: startsAt || null,
      registration_opens_at: opensAt || null,
      registration_closes_at: closesAt || null,
      is_published: isPublished,
    };

    save(
      () => (course ? api.put(`/courses/${course.id}`, payload) : api.post("/courses", payload)),
      {
        success: course ? "Course updated." : "Course created.",
        failure: "Could not save this course.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={course ? "Edit course" : "New course"}
      onSubmit={handleSubmit}
      submitLabel={course ? "Save changes" : "Create course"}
    >
      <div className="-mx-1 flex max-h-[60vh] flex-col gap-5 overflow-y-auto px-1">
        <Field data-invalid={!!fieldError("title") || undefined}>
          <FieldLabel htmlFor="course-title">Title</FieldLabel>
          <Input
            id="course-title"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            required
          />
          <FieldError>{fieldError("title")}</FieldError>
        </Field>
        <Field data-invalid={!!fieldError("slug") || undefined}>
          <FieldLabel htmlFor="course-slug">Slug</FieldLabel>
          <Input
            id="course-slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugTouched(true);
            }}
            required
          />
          <FieldDescription>Unique, URL-friendly identifier.</FieldDescription>
          <FieldError>{fieldError("slug")}</FieldError>
        </Field>
        <Field data-invalid={!!fieldError("type") || undefined}>
          <FieldLabel>Type</FieldLabel>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as CourseType)}
            className="flex gap-4"
          >
            {(["arabic", "quran"] as const).map((option) => (
              <FieldLabel key={option} className="flex items-center gap-2 font-normal capitalize">
                <RadioGroupItem value={option} />
                {option}
              </FieldLabel>
            ))}
          </RadioGroup>
          <FieldError>{fieldError("type")}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!fieldError("level") || undefined}>
            <FieldLabel htmlFor="course-level">Level</FieldLabel>
            <Input
              id="course-level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              placeholder="e.g. Beginner"
            />
            <FieldError>{fieldError("level")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("price") || undefined}>
            <FieldLabel htmlFor="course-price">Price</FieldLabel>
            <Input
              id="course-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0 = free"
            />
            <FieldError>{fieldError("price")}</FieldError>
          </Field>
        </div>
        <Field data-invalid={!!fieldError("description") || undefined}>
          <FieldLabel htmlFor="course-description">Description</FieldLabel>
          <Textarea
            id="course-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <FieldError>{fieldError("description")}</FieldError>
        </Field>
        <Field data-invalid={!!fieldError("starts_at") || undefined}>
          <FieldLabel htmlFor="course-starts">Starts</FieldLabel>
          <Input id="course-starts" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <FieldError>{fieldError("starts_at")}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!fieldError("registration_opens_at") || undefined}>
            <FieldLabel htmlFor="course-opens">Registration opens</FieldLabel>
            <Input id="course-opens" type="date" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} />
            <FieldError>{fieldError("registration_opens_at")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("registration_closes_at") || undefined}>
            <FieldLabel htmlFor="course-closes">Registration closes</FieldLabel>
            <Input
              id="course-closes"
              type="date"
              value={closesAt}
              min={opensAt || undefined}
              onChange={(event) => setClosesAt(event.target.value)}
            />
            <FieldError>{fieldError("registration_closes_at")}</FieldError>
          </Field>
        </div>
        <FieldLabel htmlFor="course-published" className="flex items-center gap-2 font-normal">
          <Checkbox
            id="course-published"
            checked={isPublished}
            onCheckedChange={(checked) => setIsPublished(checked)}
          />
          Published (visible to students)
        </FieldLabel>
      </div>
    </FormDialog>
  );
}
