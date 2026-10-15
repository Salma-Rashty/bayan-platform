"use client";

import { useSyncExternalStore } from "react";

/** Only same-site paths: "/courses/3" yes; "//evil.example" or "https://..." no (open redirect). */
function safePath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

/** The `?next=` page to return to after logging in or registering, if any. */
export function useAuthNext(): string | null {
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => ""
  );
  return safePath(new URLSearchParams(search).get("next"));
}

/** Link to the login or register page that brings the user back to `next` afterwards. */
export function authHref(page: "/login" | "/register", next: string | null): string {
  return next ? `${page}?next=${encodeURIComponent(next)}` : page;
}
