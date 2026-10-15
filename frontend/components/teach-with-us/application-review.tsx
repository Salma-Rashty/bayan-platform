import type { ReactNode } from "react";
import { PencilIcon } from "lucide-react";
import { formatPhoneNumberIntl } from "react-phone-number-input/max";

import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/countries";
import {
  AGE_GROUP_LABELS,
  chosenCategories,
  formatBytes,
  formatDuration,
  GENDER_LABELS,
  type DetailsValues,
  type Documents,
  type Selections,
} from "@/lib/teacher-application-form";
import type { AgeGroup, TeacherApplicationCatalogCategory } from "@/lib/types";

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

function ageGroupList(groups: AgeGroup[]): string {
  return groups.map((group) => AGE_GROUP_LABELS[group]).join(", ");
}

function formatBirthDate(value: string): string {
  // Parsed as a local date: `new Date("1990-04-12")` would be UTC midnight and can show the day before.
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: "long" });
}

/** Everything the applicant entered, read-only, with a way back to each step. */
export function ApplicationReview({
  details,
  catalog,
  selections,
  documents,
  onEdit,
}: {
  details: DetailsValues;
  catalog: TeacherApplicationCatalogCategory[];
  selections: Selections;
  documents: Documents;
  onEdit: (step: number) => void;
}) {
  const nationality = COUNTRIES.find((country) => country.code === details.nationality)?.name ?? details.nationality;

  return (
    <div className="flex flex-col gap-5">
      <Section title="Your details" onEdit={() => onEdit(0)}>
        <dl className="flex flex-col gap-2">
          <Row label="Name">
            {details.first_name.trim()} {details.last_name.trim()}
          </Row>
          <Row label="Email">{details.email.trim()}</Row>
          <Row label="Phone">
            {formatPhoneNumberIntl(details.phone) || details.phone}
          </Row>
          <Row label="Nationality">{nationality}</Row>
          <Row label="Birth date">{details.birth_date && formatBirthDate(details.birth_date)}</Row>
          <Row label="Gender">{details.gender && GENDER_LABELS[details.gender]}</Row>
        </dl>
      </Section>

      <Section title="What you can teach" onEdit={() => onEdit(1)}>
        <ul className="flex flex-col gap-3">
          {chosenCategories(catalog, selections).map((category) => {
            const selection = selections[category.id];
            return (
              <li key={category.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-foreground">{category.name}</p>
                {category.has_levels ? (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {category.levels
                      .filter((level) => selection.levels[level.id])
                      .map((level) => (
                        <li key={level.id} className="text-sm">
                          <span className="text-foreground">{level.name}</span>
                          <span className="text-muted-foreground"> — {ageGroupList(selection.levels[level.id])}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{ageGroupList(selection.ageGroups)}</p>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="About you & documents" onEdit={() => onEdit(2)}>
        <dl className="flex flex-col gap-2">
          <Row label="About you">
            <span className="whitespace-pre-line">{details.about.trim()}</span>
          </Row>
          <Row label="CV">
            {documents.cv && (
              <>
                {documents.cv.name} <span className="text-muted-foreground">({formatBytes(documents.cv.size)})</span>
              </>
            )}
          </Row>
          <Row label="Video">
            {documents.video ? (
              <>
                {documents.video.name}{" "}
                <span className="text-muted-foreground">
                  ({formatBytes(documents.video.size)}
                  {documents.videoSeconds !== null && `, ${formatDuration(documents.videoSeconds)}`})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </Row>
        </dl>
      </Section>
    </div>
  );
}
