"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";

import { useAdminNav, type AdminSection } from "@/lib/admin-sections";

const itemClass = "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors";
const activeClass = "bg-muted text-foreground";
const inactiveClass = "text-muted-foreground hover:text-foreground";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(itemClass, active ? activeClass : inactiveClass)}>
      {label}
    </Link>
  );
}

/**
 * A nav entry that expands inline to show its links; it has no page of its own. Expanded
 * while on one of its routes, collapsed elsewhere; a manual toggle holds until the route
 * moves into or out of the group.
 */
function NavGroup({ label, sections, pathname }: { label: string; sections: AdminSection[]; pathname: string }) {
  const childrenId = useId();
  const onGroupRoute = sections.some((section) => pathname.startsWith(section.href));

  const [toggled, setToggled] = useState<boolean | null>(null);
  // Entering or leaving the group's routes resets any manual toggle (React's
  // "adjusting state when a prop changes" pattern, as in useApiGet).
  const [trackedOnGroupRoute, setTrackedOnGroupRoute] = useState(onGroupRoute);
  if (trackedOnGroupRoute !== onGroupRoute) {
    setTrackedOnGroupRoute(onGroupRoute);
    setToggled(null);
  }
  const expanded = toggled ?? onGroupRoute;

  return (
    <div className={cn("flex shrink-0 items-center gap-1 rounded-lg", expanded && "bg-muted/40 pr-1")}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={childrenId}
        onClick={() => setToggled(!expanded)}
        className={cn(
          itemClass,
          "inline-flex items-center gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          // While collapsed, highlight the group itself if the current page is inside it.
          !expanded && onGroupRoute ? activeClass : expanded ? "text-foreground" : inactiveClass
        )}
      >
        {label}
        <ChevronDownIcon className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
      </button>
      <div id={childrenId} role="group" aria-label={label} className={cn("items-center gap-1", expanded ? "flex" : "hidden")}>
        {sections.map((section) => (
          <NavLink
            key={section.href}
            href={section.href}
            label={section.label}
            active={pathname.startsWith(section.href)}
          />
        ))}
      </div>
    </div>
  );
}

export function AdminSubnav() {
  const pathname = usePathname();
  const entries = useAdminNav();

  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto border-b pb-2" aria-label="Admin sections">
      <NavLink href="/admin" label="Overview" active={pathname === "/admin"} />
      {entries.map((entry) =>
        entry.kind === "group" ? (
          <NavGroup key={entry.label} label={entry.label} sections={entry.sections} pathname={pathname} />
        ) : (
          <NavLink
            key={entry.section.href}
            href={entry.section.href}
            label={entry.section.label}
            active={pathname.startsWith(entry.section.href)}
          />
        )
      )}
    </nav>
  );
}
