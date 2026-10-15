import { parsePhoneNumber } from "react-phone-number-input/max";
import { z } from "zod";

import { COUNTRIES } from "@/lib/countries";
import type { AgeGroup, TeacherApplicationCatalogCategory } from "@/lib/types";

/** Mirrors StoreTeacherApplicationRequest (CV_MAX_KB / VIDEO_MAX_KB). */
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
export const CV_EXTENSIONS = ["pdf", "doc", "docx"];
/** Guidance only: longer videos are allowed if they fit the size cap. */
export const VIDEO_SUGGESTED_SECONDS = 5 * 60;
/** Mirrors ABOUT_MIN_WORDS / ABOUT_MAX_WORDS. */
export const ABOUT_MIN_WORDS = 50;
export const ABOUT_MAX_WORDS = 300;

/**
 * Words are runs of non-whitespace; JS `\s` already covers Unicode spaces such as the
 * non-breaking space. Keep in sync with App\Rules\WordCount::count() on the API.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function countryName(code: string): string {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

/**
 * Whether an E.164 number (as produced by the phone input) is valid FOR `country`, using
 * libphonenumber's full metadata, like the API. A valid number belonging to another country
 * sharing the calling code (e.g. Canada under the US) doesn't count.
 */
export function isValidPhoneForCountry(phone: string, country: string): boolean {
  const parsed = parsePhoneNumber(phone);
  return !!parsed && parsed.country === country && parsed.isValid();
}

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "children", label: "Children" },
  { value: "teenagers", label: "Teenagers" },
  { value: "adults", label: "Adults" },
  { value: "elderly", label: "Elderly" },
];

export const AGE_GROUP_LABELS = Object.fromEntries(AGE_GROUPS.map((group) => [group.value, group.label])) as Record<
  AgeGroup,
  string
>;

export const GENDER_LABELS = { male: "Male", female: "Female" } as const;

/** Yesterday as YYYY-MM-DD in the applicant's local time: the latest valid birth date. */
export function maxBirthDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The plain-text fields; selections and files are validated separately below. */
export const detailsSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required.").max(100, "First name is too long."),
    last_name: z.string().trim().min(1, "Last name is required.").max(100, "Last name is too long."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address.").max(255),
    /** E.164 from the phone input ("" until a number is entered). */
    phone: z.string().min(1, "Enter your phone number."),
    phone_country: z.string(),
    nationality: z.string().min(1, "Choose your nationality."),
    birth_date: z
      .string()
      .min(1, "Birth date is required.")
      .refine((value) => value <= maxBirthDate(), "Your birth date must be in the past.")
      .refine((value) => value >= "1900-01-01", "Enter a valid birth date."),
    gender: z.enum(["male", "female"], { message: "Choose your gender." }),
    about: z
      .string()
      .trim()
      .max(5000, "Please keep this under 5,000 characters.")
      .superRefine((value, ctx) => {
        const words = countWords(value);
        if (words < ABOUT_MIN_WORDS) {
          ctx.addIssue({ code: "custom", message: `Please write at least ${ABOUT_MIN_WORDS} words (you have ${words}).` });
        } else if (words > ABOUT_MAX_WORDS) {
          ctx.addIssue({ code: "custom", message: `Please keep this to ${ABOUT_MAX_WORDS} words or fewer (you have ${words}).` });
        }
      }),
  })
  // An empty phone is reported by the field's own required check above.
  .refine(({ phone, phone_country }) => !phone || (!!phone_country && isValidPhoneForCountry(phone, phone_country)), {
    path: ["phone"],
    // Run even while other fields are invalid (e.g. gender not yet chosen), so the phone is
    // checked as soon as it's entered rather than only once the rest of the step is valid.
    when: ({ value }) => {
      const { phone, phone_country } = (value ?? {}) as { phone?: unknown; phone_country?: unknown };
      return typeof phone === "string" && typeof phone_country === "string";
    },
    error: ({ input }) => {
      const { phone_country } = input as { phone_country: string };
      return phone_country
        ? `Enter a valid phone number for ${countryName(phone_country)}.`
        : "Choose the country for your phone number.";
    },
  });

export type DetailsValues = z.input<typeof detailsSchema>;

export const EMPTY_DETAILS: DetailsValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  phone_country: "",
  nationality: "",
  birth_date: "",
  gender: "" as DetailsValues["gender"],
  about: "",
};

/** Fields on each form step, for jumping back to the step that has an error. */
export const STEP_FIELDS: (keyof DetailsValues)[][] = [
  ["first_name", "last_name", "email", "phone", "phone_country", "nationality", "birth_date", "gender"],
  [],
  ["about"],
];

/**
 * What the applicant chose, keyed by category id: levels (with their age groups) when the
 * category has levels, otherwise age groups for the category itself.
 */
export type Selections = Record<number, { levels: Record<number, AgeGroup[]>; ageGroups: AgeGroup[] }>;

/** Error messages keyed by "categories", "category.{id}" or "level.{id}". */
export type SelectionErrors = Record<string, string>;

/** The chosen categories that still exist in the live catalog, in catalog order. */
export function chosenCategories(catalog: TeacherApplicationCatalogCategory[], selections: Selections): TeacherApplicationCatalogCategory[] {
  return catalog.filter((category) => selections[category.id]);
}

export function validateSelections(catalog: TeacherApplicationCatalogCategory[], selections: Selections): SelectionErrors {
  const errors: SelectionErrors = {};
  const chosen = chosenCategories(catalog, selections);

  if (chosen.length === 0) {
    errors.categories = "Choose at least one category you can teach.";
  }

  for (const category of chosen) {
    const selection = selections[category.id];

    if (!category.has_levels) {
      if (selection.ageGroups.length === 0) {
        errors[`category.${category.id}`] = "Choose at least one age group.";
      }
      continue;
    }

    const levels = category.levels.filter((level) => selection.levels[level.id]);
    if (levels.length === 0) {
      errors[`category.${category.id}`] = "Choose at least one level.";
    }
    for (const level of levels) {
      if (selection.levels[level.id].length === 0) {
        errors[`level.${level.id}`] = "Choose at least one age group for this level.";
      }
    }
  }

  return errors;
}

export interface Documents {
  cv: File | null;
  video: File | null;
  /** Read from the file's metadata in the browser, when it can be. */
  videoSeconds: number | null;
}

export type DocumentErrors = Partial<Record<"cv" | "video", string>>;

export function validateDocuments({ cv, video }: Documents): DocumentErrors {
  const errors: DocumentErrors = {};
  const extension = cv?.name.split(".").pop()?.toLowerCase() ?? "";

  if (!cv) {
    errors.cv = "Upload your CV.";
  } else if (!CV_EXTENSIONS.includes(extension)) {
    errors.cv = "Your CV must be a PDF or Word document.";
  } else if (cv.size > CV_MAX_BYTES) {
    errors.cv = "Your CV must be 5 MB or smaller.";
  }

  if (video && !video.type.startsWith("video/")) {
    errors.video = "The introduction video must be a video file.";
  } else if (video && video.size > VIDEO_MAX_BYTES) {
    errors.video = "The introduction video must be 500 MB or smaller.";
  }

  return errors;
}

/**
 * The multipart payload the API expects:
 *   categories[i][id], categories[i][levels][j][id], categories[i][levels][j][age_groups][],
 *   categories[i][age_groups][]
 * Returns the categories in submitted order too, to label index-based server errors.
 */
export function buildFormData(
  details: DetailsValues,
  catalog: TeacherApplicationCatalogCategory[],
  selections: Selections,
  documents: Documents
): { body: FormData; submitted: TeacherApplicationCatalogCategory[] } {
  const body = new FormData();
  const parsed = detailsSchema.parse(details);

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== "") body.append(key, value);
  }

  const submitted = chosenCategories(catalog, selections);
  submitted.forEach((category, i) => {
    const selection = selections[category.id];
    body.append(`categories[${i}][id]`, String(category.id));

    if (category.has_levels) {
      category.levels
        .filter((level) => selection.levels[level.id])
        .forEach((level, j) => {
          body.append(`categories[${i}][levels][${j}][id]`, String(level.id));
          for (const group of selection.levels[level.id]) {
            body.append(`categories[${i}][levels][${j}][age_groups][]`, group);
          }
        });
    } else {
      for (const group of selection.ageGroups) {
        body.append(`categories[${i}][age_groups][]`, group);
      }
    }
  });

  if (documents.cv) body.append("cv", documents.cv);
  if (documents.video) body.append("video", documents.video);

  return { body, submitted };
}

/** Which form step a server validation key belongs to. */
export function stepForServerField(field: string): number {
  if (field.startsWith("categories")) return 1;
  if (field === "about" || field === "cv" || field === "video") return 2;
  // phone, phone_country and the rest of the applicant details
  return 0;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}
