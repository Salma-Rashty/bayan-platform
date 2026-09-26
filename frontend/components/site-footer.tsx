import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Bayan — learn Arabic and the Quran.</p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <Link href="/teach-with-us" className="hover:text-foreground hover:underline">
            Teach with us
          </Link>
        </nav>
      </div>
    </footer>
  );
}
