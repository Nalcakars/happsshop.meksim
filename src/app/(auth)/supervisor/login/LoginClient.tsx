"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginClient() {
  const router = useRouter();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "HappsShop";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setErr(data?.message ?? "Giriş başarısız.");
        return;
      }

      // login başarılı → supervisor dashboard
      router.replace("/supervisor");
    } catch {
      setErr("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[--spot-surface] text-[--foreground]">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#845ec2]/18 blur-3xl animate-pulse" />
        <div className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-[#b39cd0]/22 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#00c9a7]/14 blur-3xl animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-25" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image
              src="/meksimlogo.png"
              alt={`${appName} Logo`}
              width={160}
              height={56}
              priority
            />
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/75 p-6 shadow-xl backdrop-blur">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="ornek@domain.com"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[--foreground] outline-none transition placeholder:text-black/40 focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Şifre
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[--foreground] outline-none transition placeholder:text-black/40 focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              {err && (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                disabled={!canSubmit}
                className="group relative w-full overflow-hidden rounded-2xl
                           border border-[#845ec2]/35
                           bg-white px-4 py-3
                           text-sm font-semibold text-[--foreground]
                           shadow-md transition
                           hover:border-[#845ec2]/55
                           hover:shadow-lg
                           focus:outline-none focus:ring-4 focus:ring-[#b39cd0]/30
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className="absolute inset-0 -translate-x-full
                             bg-gradient-to-r
                             from-[#845ec2]/40
                             via-[#b39cd0]/40
                             to-[#00c9a7]/30
                             transition-transform duration-500
                             group-hover:translate-x-0"
                />
                <span className="relative">
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
