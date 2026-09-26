"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFor(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Nav() {
  const { user, loading, logout, hasRole, hasAnyRole, hasPermission } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("Logged out.");
    router.push("/login");
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg font-semibold">
          Bayan
        </Link>

        {!loading && (
          <nav className="flex items-center gap-4">
            <Link
              href="/teach-with-us"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground hover:underline sm:inline"
            >
              Teach with us
            </Link>
            {user && hasRole("student") && (
              <div className="flex items-center gap-4">
                <Link href="/courses" className="text-sm font-medium text-foreground hover:underline">
                  Courses
                </Link>
                <Link href="/my/courses" className="text-sm font-medium text-foreground hover:underline">
                  My Courses
                </Link>
              </div>
            )}
            {user && hasAnyRole(STAFF_ROLES) && (
              <Link href="/teach" className="text-sm font-medium text-foreground hover:underline">
                Teach
              </Link>
            )}
            {user && hasAnyRole(ADMIN_ROLES) && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                  Admin
                  <ChevronDownIcon className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem render={<Link href="/admin" />}>Overview</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {ADMIN_SECTIONS.filter((section) => hasPermission(section.permission)).map((section) => (
                    <DropdownMenuItem key={section.href} render={<Link href={section.href} />}>
                      {section.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Avatar>
                    <AvatarFallback>{initialsFor(user.name)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.roles.join(", ")}
                      </span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
                  Log in
                </Button>
                <Button nativeButton={false} render={<Link href="/register" />}>
                  Sign up
                </Button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
