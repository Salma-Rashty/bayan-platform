"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { useAuth } from "@/lib/auth-context";

export function AdminSubnav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const links = [
    { href: "/admin", label: "Overview" },
    ...ADMIN_SECTIONS.filter((section) => hasPermission(section.permission)),
  ];

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2" aria-label="Admin sections">
      {links.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
