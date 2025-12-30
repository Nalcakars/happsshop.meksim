"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import {
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";

type NavItem = { id: string; href: string; label: string };

type NavGroup =
  | {
      type: "group";
      id: string;
      label: string;
      icon: React.ReactNode;
      items: NavItem[];
    }
  | {
      type: "link";
      href: string;
      label: string;
      icon: React.ReactNode;
    };

export default function SidebarNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/supervisor" ? pathname === href : pathname.startsWith(href);

  const groups: NavGroup[] = useMemo(
    () => [
      {
        type: "group",
        id: "commerce",
        label: "E-Ticaret Yönetimi",
        icon: <ShoppingBag className="h-5 w-5" />,
        items: [
          {
            id: "orders",
            href: "/supervisor/coming-soon",
            label: "Siparişler",
          },
          { id: "products", href: "/supervisor/products", label: "Ürünler" },
          {
            id: "categories",
            href: "/supervisor/categories",
            label: "Kategoriler",
          },
          { id: "brands", href: "/supervisor/brands", label: "Markalar" },
        ],
      },
      {
        type: "group",
        id: "users",
        label: "Kullanıcı Yönetimi",
        icon: <Users className="h-5 w-5" />,
        items: [
          {
            id: "customers",
            href: "/supervisor/customers",
            label: "Müşteriler",
          },
          {
            id: "accounts",
            href: "/supervisor/coming-soon",
            label: "Temsilciler",
          },
        ],
      },
      {
        type: "group",
        id: "reports",
        label: "Raporlar",
        icon: <BarChart3 className="h-5 w-5" />,
        items: [
          {
            id: "sales-report",
            href: "/supervisor/coming-soon",
            label: "Satış Raporu",
          },
        ],
      },
      {
        type: "group",
        id: "settings",
        label: "Ayarlar",
        icon: <Settings className="h-5 w-5" />,
        items: [
          {
            id: "general-settings",
            href: "/supervisor/coming-soon",
            label: "Genel Ayarlar",
          },
          {
            id: "company-settings",
            href: "/supervisor/coming-soon",
            label: "Firma Ayarları",
          },
        ],
      },
    ],
    []
  );

  const groupHasActive = (items: NavItem[]) =>
    items.some((i) => isActive(i.href));

  // aktif grup(lar) default açık gelsin
  const defaultOpen = useMemo(() => {
    const s = new Set<string>();
    for (const g of groups) {
      if (g.type === "group" && groupHasActive(g.items)) s.add(g.id);
    }
    return s;
  }, [groups, pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(defaultOpen);

  // route değişince aktif grubu aç (kapalıysa)
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      for (const g of groups) {
        if (g.type === "group" && groupHasActive(g.items)) next.add(g.id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col p-4">
      {/* Logo */}
      <div className="mb-3 flex items-center justify-center py-2">
        <Link
          href="/supervisor"
          aria-label="Supervisor Ana Sayfa"
          onClick={onNavigate}
        >
          <Image
            src="/meksimlogo.png"
            alt="Meksim Logo"
            width={180}
            height={60}
            priority
            className="h-12 w-auto cursor-pointer transition-opacity hover:opacity-80"
          />
        </Link>
      </div>

      <div className="mt-2 space-y-2">
        {groups.map((g) => {
          // Tek link
          if (g.type === "link") {
            const active = isActive(g.href);

            return (
              <Link
                key={g.href}
                href={g.href}
                onClick={onNavigate}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active
                    ? "border border-black/10 bg-white shadow-sm"
                    : "border border-transparent hover:border-black/10 hover:bg-white/60",
                ].join(" ")}
              >
                <span
                  className={active ? "text-[--spot-primary]" : "text-black/55"}
                >
                  {g.icon}
                </span>
                <span
                  className={
                    active
                      ? "font-semibold text-[--foreground]"
                      : "text-black/75"
                  }
                >
                  {g.label}
                </span>
              </Link>
            );
          }

          // Gruplar (accordion)
          const opened = openGroups.has(g.id);
          const activeGroup = groupHasActive(g.items);

          return (
            <div
              key={g.id}
              className="rounded-2xl border border-black/10 bg-white/55 shadow-sm backdrop-blur"
            >
              <button
                type="button"
                onClick={() => toggle(g.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      activeGroup ? "text-[--spot-primary]" : "text-black/55"
                    }
                  >
                    {g.icon}
                  </span>
                  <span
                    className={
                      activeGroup
                        ? "font-semibold text-[--foreground]"
                        : "text-black/80"
                    }
                  >
                    {g.label}
                  </span>
                </div>

                <ChevronRight
                  className={[
                    "h-5 w-5 text-black/45 transition-transform",
                    opened ? "rotate-90" : "rotate-0",
                  ].join(" ")}
                />
              </button>

              {/* Submenu */}
              <div className={[opened ? "block" : "hidden", "pb-3"].join(" ")}>
                <div className="space-y-1 px-2">
                  {g.items.map((it) => {
                    const active = isActive(it.href);
                    return (
                      <Link
                        key={it.id}
                        href={it.href}
                        onClick={onNavigate}
                        className={[
                          "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                          active
                            ? "border border-black/10 bg-white"
                            : "border border-transparent hover:border-black/10 hover:bg-white/70",
                        ].join(" ")}
                      >
                        <span
                          className={
                            active
                              ? "font-semibold text-[--foreground]"
                              : "text-black/75"
                          }
                        >
                          {it.label}
                        </span>
                        {active && (
                          <span className="text-xs text-black/40">•</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4" />
    </div>
  );
}
