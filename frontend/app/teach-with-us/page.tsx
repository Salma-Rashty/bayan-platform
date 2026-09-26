"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Mirrors StoreTeacherApplicationRequest. The API takes the CV as a `cv_path` string
// (max 255) rather than a file upload, so applicants share a link to it.
const applicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255, "Name is too long."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address.").max(255),
  phone: z.string().trim().max(255, "Phone number is too long."),
  qualifications: z.string().trim(),
  cv_path: z
    .string()
    .trim()
    .max(255, "Link must be 255 characters or fewer.")
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a full link starting with https://"),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

const KNOWN_FIELDS = ["name", "email", "phone", "qualifications", "cv_path"] as const;

const EMPTY_VALUES: ApplicationValues = { name: "", email: "", phone: "", qualifications: "", cv_path: "" };

const NEXT_STEPS = [
  { title: "We review your application", body: "Our team reads every application and your teaching background." },
  { title: "We get in touch", body: "If it looks like a good fit, we'll contact you by email to talk further." },
  { title: "Start teaching", body: "Accepted teachers get a Bayan teacher account to run their classes." },
];

function Confirmation({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2Icon className="size-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Application received</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thank you for applying to teach with Bayan. We&apos;ll review your application and get back to you at{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
        <Button variant="outline" onClick={onReset} className="mt-2">
          Submit another application
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeachWithUsPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: ApplicationValues) {
    try {
      await api.post("/teacher-applications", {
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        qualifications: values.qualifications || null,
        cv_path: values.cv_path || null,
      });
      reset(EMPTY_VALUES);
      setSubmittedEmail(values.email);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else if (error instanceof ApiError && error.errors) {
        const messages: string[] = [];
        for (const [field, fieldMessages] of Object.entries(error.errors)) {
          messages.push(fieldMessages[0]);
          if ((KNOWN_FIELDS as readonly string[]).includes(field)) {
            setError(field as (typeof KNOWN_FIELDS)[number], { message: fieldMessages[0] });
          }
        }
        toast.error(messages.join(" ") || error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:py-16">
      <section className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">Teach with us</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Share your knowledge of Arabic and the Quran</h1>
          <p className="mt-3 text-muted-foreground">
            Bayan is looking for teachers who care about helping students learn. Tell us a little about yourself
            and your experience, and we&apos;ll be in touch.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-foreground">What happens next</h2>
          <ol className="flex flex-col gap-4">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-live="polite">
        {submittedEmail ? (
          <Confirmation email={submittedEmail} onReset={() => setSubmittedEmail(null)} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Apply to teach</CardTitle>
              <CardDescription>Fields marked optional can be left blank.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.name || undefined}>
                      <FieldLabel htmlFor="name">Full name</FieldLabel>
                      <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
                      <FieldError errors={[errors.name]} />
                    </Field>

                    <Field data-invalid={!!errors.email || undefined}>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                      />
                      <FieldError errors={[errors.email]} />
                    </Field>
                  </div>

                  <Field data-invalid={!!errors.phone || undefined}>
                    <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      aria-invalid={!!errors.phone}
                      {...register("phone")}
                    />
                    <FieldError errors={[errors.phone]} />
                  </Field>

                  <Field data-invalid={!!errors.qualifications || undefined}>
                    <FieldLabel htmlFor="qualifications">Qualifications &amp; experience (optional)</FieldLabel>
                    <Textarea
                      id="qualifications"
                      rows={5}
                      placeholder="e.g. Ijazah in Tajweed, 5 years teaching children online..."
                      aria-invalid={!!errors.qualifications}
                      {...register("qualifications")}
                    />
                    <FieldError errors={[errors.qualifications]} />
                  </Field>

                  <Field data-invalid={!!errors.cv_path || undefined}>
                    <FieldLabel htmlFor="cv_path">Link to your CV (optional)</FieldLabel>
                    <Input
                      id="cv_path"
                      type="url"
                      inputMode="url"
                      placeholder="https://drive.google.com/..."
                      aria-invalid={!!errors.cv_path}
                      {...register("cv_path")}
                    />
                    <FieldDescription>
                      Share a link to your CV (Google Drive, Dropbox, LinkedIn...). Make sure it&apos;s viewable by
                      anyone with the link.
                    </FieldDescription>
                    <FieldError errors={[errors.cv_path]} />
                  </Field>

                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
                    {isSubmitting ? "Submitting..." : "Submit application"}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Looking to learn instead?{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Create a student account
          </Link>
        </p>
      </section>
    </div>
  );
}
