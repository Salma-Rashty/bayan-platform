import { CalendarCheckIcon, FileTextIcon, SearchCheckIcon, SendIcon } from "lucide-react";

const SOUGHT = [
  "A solid command of what you teach, ideally with an ijazah or formal qualification",
  "Teaching experience, online or in person, with any age group",
  "Patience, warmth and clear communication with learners",
  "Reliability: keeping to a schedule your students can count on",
];

const PROCESS = [
  { icon: SendIcon, title: "Submit", body: "Send your application with your CV and, if you like, a short introduction video." },
  { icon: SearchCheckIcon, title: "Review", body: "Our team reads every application and looks at your background and documents." },
  { icon: CalendarCheckIcon, title: "Interview", body: "Shortlisted applicants are invited to a short online interview and sample lesson." },
  { icon: FileTextIcon, title: "Decision", body: "We let you know by email. Accepted teachers get a Bayan teacher account." },
];

/** Static left column of the "Teach with us" page. `subjects` comes from the live catalog. */
export function InfoPanel({ subjects }: { subjects: string[] | null }) {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Teach with us</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Share your knowledge of Arabic and the Quran</h1>
        <p className="mt-3 text-muted-foreground">
          Bayan is an online learning platform connecting students of every age with qualified teachers of Arabic
          and the Quran. We&apos;re growing, and we&apos;re looking for teachers who care about helping students learn.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">What we teach</h2>
        {subjects === null ? (
          <p className="text-sm text-muted-foreground">Loading subjects...</p>
        ) : subjects.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <li key={subject} className="rounded-full border px-3 py-1 text-sm text-foreground">
                {subject}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Arabic language and Quran studies for all ages.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">What we look for</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
          {SOUGHT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground">How it works</h2>
        <ol className="flex flex-col">
          {PROCESS.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {index < PROCESS.length - 1 && (
                <span aria-hidden className="absolute top-9 bottom-1 left-[1.0625rem] w-px bg-border" />
              )}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-primary">
                <step.icon className="size-4" aria-hidden />
              </span>
              <div className="pt-1.5">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">{index + 1}.</span> {step.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
