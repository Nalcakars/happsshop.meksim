"use client";

import LogoutButton from "./LogoutButton";

export default function Topbar({
  title = "Supervisor",
  onOpenSidebar,
  accountName,
}: {
  title?: string;
  onOpenSidebar: () => void;
  accountName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 shadow-sm hover:bg-white md:hidden"
            aria-label="Menüyü aç"
          >
            <div className="space-y-1.5">
              <div className="h-0.5 w-5 bg-black/70" />
              <div className="h-0.5 w-5 bg-black/70" />
              <div className="h-0.5 w-5 bg-black/70" />
            </div>
          </button>

          {accountName ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-black/55">Hoş geldin</span>
              <span className="font-semibold text-[--foreground]">
                {accountName}
              </span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-[--foreground]">
              {title}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
