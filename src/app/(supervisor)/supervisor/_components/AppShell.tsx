"use client";

import { useEffect, useState } from "react";
import SidebarNav from "./SidebarNav";
import Topbar from "./Topbar";

export default function AppShell({
  children,
  title,
  accountName,
}: {
  children: React.ReactNode;
  title?: string;
  accountName?: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <div className="min-h-dvh bg-[--spot-surface] text-[--foreground]">
      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setOpen(false)}
      />

      <aside
        className={[
          "fixed left-0 top-0 z-50 h-dvh w-[280px]",
          "border-r border-black/10 bg-white/70 backdrop-blur",
          "transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarNav onNavigate={() => setOpen(false)} />
      </aside>

      <div className="md:pl-[280px]">
        <Topbar
          title={title}
          onOpenSidebar={() => setOpen(true)}
          accountName={accountName}
        />

        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
