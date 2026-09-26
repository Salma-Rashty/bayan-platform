"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

/**
 * Wraps a page's content, redirecting to /login until an authenticated user is loaded.
 * Pass `roles` to additionally require one of them; other users see an access notice.
 */
export function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (roles && !hasAnyRole(roles)) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Alert variant="destructive">
          <AlertTitle>You don&apos;t have access to this page</AlertTitle>
          <AlertDescription>This area is only available to teaching staff.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
