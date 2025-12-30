"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/supervisor/login");
      }}
      className="rounded-xl
           bg-[--spot-accent]/90
           px-4 py-2
           text-sm font-semibold
           text-[--foreground]
           shadow-sm transition
           hover:bg-[--spot-accent]
           hover:shadow-md
           active:scale-[0.98]"
    >
      Çıkış Yap
    </button>
  );
}
