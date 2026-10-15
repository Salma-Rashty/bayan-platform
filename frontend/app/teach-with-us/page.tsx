"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, CheckCircle2Icon, CheckIcon } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CountrySelect } from "@/components/admin/country-select";
import { ApplicationReview } from "@/components/teach-with-us/application-review";
import { FileField } from "@/components/teach-with-us/file-field";
import { InfoPanel } from "@/components/teach-with-us/info-panel";
import { PhoneField } from "@/components/teach-with-us/phone-field";
import { TeachingPicker } from "@/components/teach-with-us/teaching-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiUpload, ApiError } from "@/lib/api";
import {
  ABOUT_MAX_WORDS,
  ABOUT_MIN_WORDS,
  buildFormData,
  countWords,
  detailsSchema,
  EMPTY_DETAILS,
  formatDuration,
  GENDER_LABELS,
  maxBirthDate,
  stepForServerField,
  STEP_FIELDS,
  validateDocuments,
  validateSelections,
  VIDEO_SUGGESTED_SECONDS,
  type DetailsValues,
  type DocumentErrors,
  type Documents,
  type SelectionErrors,
  type Selections,
} from "@/lib/teacher-application-form";
import type { MyTeacherApplications, TeacherApplicationCatalogCategory, User } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { authHref } from "@/lib/auth-redirect";
import { formatDate } from "@/lib/format";
import { useApiGet } from "@/lib/use-api-get";

const STEPS = [
  { title: "Your details", description: "Tell us who you are and how to reach you." },
  { title: "What you teach", description: "Choose the subjects, levels and age groups you can teach." },
  { title: "About you & documents", description: "Share your experience, your CV and an optional video." },
  { title: "Review", description: "Check everything before you submit. You can go back and edit any section." },
];

const REVIEW_STEP = STEPS.length - 1;

const EMPTY_DOCUMENTS: Documents = { cv: null, video: null, videoSeconds: null };

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Application progress">
      {STEPS.map((entry, index) => (
        <li
          key={entry.title}
          className={`flex items-center gap-2 ${index < STEPS.length - 1 ? "flex-1" : ""}`}
          aria-current={index === step ? "step" : undefined}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              index < step
                ? "bg-primary text-primary-foreground"
                : index === step
                  ? "border-2 border-primary text-primary"
                  : "border text-muted-foreground"
            }`}
          >
            {index < step ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
          </span>
          <span className="sr-only">{entry.title}</span>
          {index < STEPS.length - 1 && (
            <span aria-hidden className={`h-px flex-1 ${index < step ? "bg-primary" : "bg-border"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

/** Reads a video's duration from its metadata; null if the browser can't decode it. */
function readVideoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (seconds: number | null) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

type CatalogRequest = ReturnType<typeof useApiGet<{ data: TeacherApplicationCatalogCategory[] }>>;

/** "Salma Al Rashty" -> first "Salma", last "Al Rashty": a starting point the applicant can edit. */
function splitName(name: string): { first_name: string; last_name: string } {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}

function Confirmation({ email, onBehalf, onReset }: { email: string; onBehalf: boolean; onReset: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2Icon className="size-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Application received</h2>
        {onBehalf ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              The application for <span className="font-medium text-foreground">{email}</span> is now in the review
              queue.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={onReset}>
                Submit another application
              </Button>
              <Button nativeButton={false} render={<Link href="/admin/teacher-applications" />}>
                Review applications
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              Thank you for applying to teach with Bayan. Our team will review your application and get back to you at{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <Button nativeButton={false} render={<Link href="/my/teacher-application" />} className="mt-2">
              View my application
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Applying needs an account. */
function SignInToApply() {
  const next = "/teach-with-us";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in to apply</CardTitle>
        <CardDescription>
          Applications are linked to your Bayan account, so you can follow their status. It only takes a minute to
          create one.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href={authHref("/register", next)} />}>
          Create an account
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={authHref("/login", next)} />}>
          Log in
        </Button>
      </CardContent>
    </Card>
  );
}

/** One application per applicant every few months: shown instead of the form while waiting. */
function CooldownNotice({ mine }: { mine: MyTeacherApplications }) {
  const latest = mine.data[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;ve already applied</CardTitle>
        <CardDescription>
          {latest && <>You applied on {formatDate(latest.created_at)}. </>}
          Applicants can apply once every {mine.cooldown_months} months, so you cannot apply again until{" "}
          <span className="font-medium text-foreground">{formatDate(mine.next_allowed_at)}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button nativeButton={false} render={<Link href="/my/teacher-application" />}>
          View my application
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * For a signed-in user: the form, or the cooldown notice. Admins always get the form and
 * apply on the applicant's behalf.
 */
function ApplicantGate({
  user,
  catalogRequest,
  onSubmitted,
}: {
  user: User;
  catalogRequest: CatalogRequest;
  onSubmitted: (email: string, onBehalf: boolean) => void;
}) {
  const mine = useApiGet<MyTeacherApplications>("/my/teacher-applications");

  if (mine.loading && !mine.data) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (mine.error || !mine.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t check your applications</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {mine.error}
          <Button type="button" size="sm" variant="outline" onClick={mine.reload}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!mine.data.can_apply) {
    return <CooldownNotice mine={mine.data} />;
  }

  const onBehalf = mine.data.cooldown_exempt;

  return (
    <div className="flex flex-col gap-4">
      {onBehalf ? (
        <Alert>
          <AlertTitle>Submitting as an admin</AlertTitle>
          <AlertDescription>
            Enter the applicant&apos;s details. Admin submissions have no cooldown, and are linked to the Bayan account
            with the applicant&apos;s email if there is one.
          </AlertDescription>
        </Alert>
      ) : (
        mine.data.data.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You&apos;ve applied before.{" "}
            <Link href="/my/teacher-application" className="text-primary underline-offset-4 hover:underline">
              View your applications
            </Link>
          </p>
        )
      )}
      <ApplicationForm
        catalogRequest={catalogRequest}
        initialDetails={onBehalf ? EMPTY_DETAILS : { ...EMPTY_DETAILS, ...splitName(user.name), email: user.email }}
        onSubmitted={(email) => onSubmitted(email, onBehalf)}
      />
    </div>
  );
}

export default function TeachWithUsPage() {
  const { user, loading } = useAuth();
  const catalogRequest = useApiGet<{ data: TeacherApplicationCatalogCategory[] }>(
    "/public/catalog/teacher-application"
  );
  const catalog = catalogRequest.data?.data ?? null;
  const [submitted, setSubmitted] = useState<{ email: string; onBehalf: boolean } | null>(null);

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_1.35fr] lg:gap-14 lg:py-16">
      <InfoPanel
        subjects={
          catalog?.filter((category) => category.is_active).map((category) => category.name) ??
          (catalogRequest.error ? [] : null)
        }
      />

      <section aria-live="polite">
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : !user ? (
          <SignInToApply />
        ) : submitted ? (
          <Confirmation email={submitted.email} onBehalf={submitted.onBehalf} onReset={() => setSubmitted(null)} />
        ) : (
          <ApplicantGate
            user={user}
            catalogRequest={catalogRequest}
            onSubmitted={(email, onBehalf) => setSubmitted({ email, onBehalf })}
          />
        )}

        {!user && !loading && (
          <p className="mt-4 text-sm text-muted-foreground">
            Looking to learn instead?{" "}
            <Link href="/courses" className="text-primary underline-offset-4 hover:underline">
              Browse our courses
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

function ApplicationForm({
  catalogRequest,
  initialDetails,
  onSubmitted,
}: {
  catalogRequest: CatalogRequest;
  initialDetails: DetailsValues;
  onSubmitted: (email: string) => void;
}) {
  const catalog = catalogRequest.data?.data ?? null;

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [selectionErrors, setSelectionErrors] = useState<SelectionErrors>({});
  const [documents, setDocuments] = useState<Documents>(EMPTY_DOCUMENTS);
  const [documentErrors, setDocumentErrors] = useState<DocumentErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    trigger,
    getValues,
    setValue,
    setError,
    formState: { errors, touchedFields },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: initialDetails,
    mode: "onTouched",
  });

  const nationality = useWatch({ control, name: "nationality" });
  const phoneCountry = useWatch({ control, name: "phone_country" });
  const aboutWords = countWords(useWatch({ control, name: "about" }));

  function goTo(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateSelections(next: Selections) {
    setSelections(next);
    // Re-check only once errors are showing, so they clear as the applicant fixes them.
    if (catalog && Object.keys(selectionErrors).length > 0) setSelectionErrors(validateSelections(catalog, next));
  }

  function updateDocuments(next: Documents) {
    setDocuments(next);
    setDocumentErrors(validateDocuments(next));
  }

  async function chooseVideo(file: File | null) {
    updateDocuments({ ...documents, video: file, videoSeconds: null });
    if (file?.type.startsWith("video/")) {
      const seconds = await readVideoSeconds(file);
      setDocuments((current) => (current.video === file ? { ...current, videoSeconds: seconds } : current));
    }
  }

  /** Validates one step; returns whether it's complete. */
  async function validateStep(index: number): Promise<boolean> {
    if (index === 0) return trigger(STEP_FIELDS[0]);
    if (index === 1) {
      if (!catalog) return false;
      const found = validateSelections(catalog, selections);
      setSelectionErrors(found);
      return Object.keys(found).length === 0;
    }
    const detailsOk = await trigger(STEP_FIELDS[2]);
    const found = validateDocuments(documents);
    setDocumentErrors(found);
    return detailsOk && Object.keys(found).length === 0;
  }

  async function handleContinue() {
    if (await validateStep(step)) goTo(step + 1);
  }

  async function handleSubmit() {
    if (!catalog) return;

    // The review only shows complete steps, but re-check in case the catalog reloaded.
    for (let index = 0; index < REVIEW_STEP; index++) {
      if (!(await validateStep(index))) {
        goTo(index);
        return;
      }
    }

    const details = getValues();
    const { body, submitted } = buildFormData(details, catalog, selections, documents);
    setServerErrors([]);
    setSubmitting(true);
    setProgress(0);

    try {
      await apiUpload("/teacher-applications", body, setProgress);
      onSubmitted(details.email.trim());
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else if (error instanceof ApiError && error.errors) {
        handleServerErrors(error.errors, submitted);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleServerErrors(fieldErrors: Record<string, string[]>, submitted: TeacherApplicationCatalogCategory[]) {
    const messages: string[] = [];
    let firstStep = REVIEW_STEP;

    for (const [field, [message]] of Object.entries(fieldErrors)) {
      firstStep = Math.min(firstStep, stepForServerField(field));

      if (field in EMPTY_DETAILS) {
        setError(field as keyof DetailsValues, { message });
      } else if (field === "cv" || field === "video") {
        setDocumentErrors((current) => ({ ...current, [field]: message }));
      }

      // Selection errors are index-based ("categories.0.levels.1.id"): name the category.
      const category = submitted[Number(field.match(/^categories\.(\d+)/)?.[1])];
      messages.push(category && !message.includes(category.name) ? `${category.name}: ${message}` : message);
    }

    setServerErrors(messages);
    goTo(firstStep);
    // Something changed in the catalog since the page loaded: fetch the current one.
    if (firstStep === 1) catalogRequest.reload();
  }

  const videoTooLong = documents.videoSeconds !== null && documents.videoSeconds > VIDEO_SUGGESTED_SECONDS + 30;

  return (
    <div ref={topRef} className="scroll-mt-6">
      <Card>
        <CardHeader className="gap-4">
          <StepIndicator step={step} />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step === REVIEW_STEP) handleSubmit();
              else handleContinue();
            }}
          >
            <FieldGroup>
              {serverErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Please fix the following and submit again</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {serverErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {step === 0 && (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.first_name || undefined}>
                      <FieldLabel htmlFor="first_name">First name</FieldLabel>
                      <Input
                        id="first_name"
                        autoComplete="given-name"
                        aria-invalid={!!errors.first_name}
                        {...register("first_name")}
                      />
                      <FieldError errors={[errors.first_name]} />
                    </Field>
                    <Field data-invalid={!!errors.last_name || undefined}>
                      <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                      <Input
                        id="last_name"
                        autoComplete="family-name"
                        aria-invalid={!!errors.last_name}
                        {...register("last_name")}
                      />
                      <FieldError errors={[errors.last_name]} />
                    </Field>
                  </div>

                  <Field data-invalid={!!errors.nationality || undefined}>
                    <FieldLabel htmlFor="nationality">Nationality</FieldLabel>
                    <Controller
                      control={control}
                      name="nationality"
                      render={({ field }) => (
                        <CountrySelect
                          id="nationality"
                          emptyLabel="Select your nationality"
                          className="w-full"
                          aria-invalid={!!errors.nationality}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    <FieldError errors={[errors.nationality]} />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.birth_date || undefined}>
                      <FieldLabel htmlFor="birth_date">Birth date</FieldLabel>
                      <Input
                        id="birth_date"
                        type="date"
                        autoComplete="bday"
                        min="1900-01-01"
                        max={maxBirthDate()}
                        // The page is prerendered, so the server's date can differ from the browser's.
                        suppressHydrationWarning
                        aria-invalid={!!errors.birth_date}
                        {...register("birth_date")}
                      />
                      <FieldError errors={[errors.birth_date]} />
                    </Field>

                    <Field data-invalid={!!errors.gender || undefined}>
                      <FieldLabel id="gender-label">Gender</FieldLabel>
                      <Controller
                        control={control}
                        name="gender"
                        render={({ field }) => (
                          <RadioGroup
                            aria-labelledby="gender-label"
                            className="flex h-8 items-center gap-5"
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              field.onBlur();
                            }}
                          >
                            {(Object.keys(GENDER_LABELS) as (keyof typeof GENDER_LABELS)[]).map((gender) => (
                              <FieldLabel
                                key={gender}
                                htmlFor={`gender-${gender}`}
                                className="flex items-center gap-2 font-normal"
                              >
                                <RadioGroupItem id={`gender-${gender}`} value={gender} aria-invalid={!!errors.gender} />
                                {GENDER_LABELS[gender]}
                              </FieldLabel>
                            ))}
                          </RadioGroup>
                        )}
                      />
                      <FieldError errors={[errors.gender]} />
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.email || undefined}>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                      />
                      <FieldDescription>We&apos;ll use this to contact you about your application.</FieldDescription>
                      <FieldError errors={[errors.email]} />
                    </Field>
                    <Field data-invalid={!!errors.phone || undefined}>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <Controller
                        control={control}
                        name="phone"
                        render={({ field }) => (
                          <PhoneField
                            id="phone"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            country={phoneCountry}
                            onCountryChange={(next) => {
                              setValue("phone_country", next);
                              // The same digits may be valid for one country and not another.
                              if (getValues("phone") && touchedFields.phone) trigger("phone");
                            }}
                            defaultCountry={nationality}
                            invalid={!!errors.phone}
                          />
                        )}
                      />
                      <FieldError errors={[errors.phone]} />
                    </Field>
                  </div>
                </>
              )}

              {step === 1 &&
                (catalogRequest.loading && !catalog ? (
                  <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((index) => (
                      <Skeleton key={index} className="h-14 w-full" />
                    ))}
                  </div>
                ) : catalogRequest.error && !catalog ? (
                  <Alert variant="destructive">
                    <AlertTitle>Couldn&apos;t load the subjects</AlertTitle>
                    <AlertDescription className="flex flex-col items-start gap-2">
                      {catalogRequest.error}
                      <Button type="button" size="sm" variant="outline" onClick={catalogRequest.reload}>
                        Try again
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  catalog && (
                    <TeachingPicker
                      catalog={catalog}
                      value={selections}
                      onChange={updateSelections}
                      errors={selectionErrors}
                    />
                  )
                ))}

              {step === 2 && (
                <>
                  <Field data-invalid={!!errors.about || undefined}>
                    <FieldLabel htmlFor="about">What would you like us to know about you?</FieldLabel>
                    <FieldDescription>
                      Between {ABOUT_MIN_WORDS} and {ABOUT_MAX_WORDS} words.
                    </FieldDescription>
                    <Textarea
                      id="about"
                      rows={7}
                      placeholder="Your qualifications (e.g. ijazah), teaching experience, the ages you've taught, your teaching style..."
                      aria-invalid={!!errors.about}
                      aria-describedby="about-count"
                      {...register("about")}
                    />
                    <p
                      id="about-count"
                      aria-live="polite"
                      className={`flex justify-between gap-2 text-xs ${
                        aboutWords > ABOUT_MAX_WORDS ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {aboutWords < ABOUT_MIN_WORDS
                          ? `${ABOUT_MIN_WORDS - aboutWords} more ${ABOUT_MIN_WORDS - aboutWords === 1 ? "word" : "words"} needed`
                          : aboutWords > ABOUT_MAX_WORDS
                            ? `${aboutWords - ABOUT_MAX_WORDS} ${aboutWords - ABOUT_MAX_WORDS === 1 ? "word" : "words"} over the limit`
                            : "Looks good"}
                      </span>
                      <span className="tabular-nums">
                        {aboutWords} / {ABOUT_MAX_WORDS} words
                      </span>
                    </p>
                    <FieldError errors={[errors.about]} />
                  </Field>

                  <FileField
                    id="cv"
                    label="CV"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    file={documents.cv}
                    onChange={(cv) => updateDocuments({ ...documents, cv })}
                    description="PDF or Word document, up to 5 MB."
                    error={documentErrors.cv}
                  />

                  <FileField
                    id="video"
                    label="Introduction video (optional)"
                    accept="video/*"
                    file={documents.video}
                    onChange={chooseVideo}
                    description="A short video introducing yourself and how you teach. Keep it to about 5 minutes; the file can be up to 500 MB."
                    error={documentErrors.video}
                  >
                    {documents.videoSeconds !== null && (
                      <p
                        className={`text-xs ${videoTooLong ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
                      >
                        Length {formatDuration(documents.videoSeconds)}
                        {videoTooLong && " — that's longer than we suggest, but you can still submit it."}
                      </p>
                    )}
                  </FileField>
                </>
              )}

              {step === REVIEW_STEP && catalog && (
                <ApplicationReview
                  details={getValues()}
                  catalog={catalog}
                  selections={selections}
                  documents={documents}
                  onEdit={goTo}
                />
              )}

              {submitting && documents.video && (
                <div className="flex flex-col gap-1.5" role="status">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploading... {Math.round(progress * 100)}%. Please keep this page open.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                {step > 0 ? (
                  <Button type="button" variant="ghost" disabled={submitting} onClick={() => goTo(step - 1)}>
                    <ArrowLeftIcon data-icon="inline-start" />
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                {step === REVIEW_STEP ? (
                  <Button type="submit" disabled={submitting || !catalog}>
                    {submitting ? "Submitting..." : "Submit application"}
                  </Button>
                ) : (
                  <Button type="submit" disabled={step === 1 && !catalog?.length}>
                    {step === REVIEW_STEP - 1 ? "Continue to review" : "Continue"}
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
