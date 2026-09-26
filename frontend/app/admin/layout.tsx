"use client";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { Protected } from "@/components/protected";
import { ADMIN_ROLES } from "@/lib/types";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Protected roles={ADMIN_ROLES}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <AdminSubnav />
        {children}
      </div>
    </Protected>
  );
}
