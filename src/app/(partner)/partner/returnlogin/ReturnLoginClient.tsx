"use client";

import { useMemo, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...(init ?? {}) });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "İstek başarısız.");
  return data as T;
}

function passwordRule(pw: string) {
  const v = (pw ?? "").trim();
  if (v.length < 6) return "Şifre en az 6 karakter olmalı.";
  return null;
}

export default function ReturnLoginClient({ token }: { token: string }) {
  const [err, setErr] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const tokenErr = useMemo(() => {
    if (!token) return "Link hatalı: token bulunamadı.";
    return null;
  }, [token]);

  const pwErr = useMemo(() => passwordRule(password), [password]);

  const confirmErr = useMemo(() => {
    if (!password2.trim()) return null;
    if (password2 !== password) return "Şifreler uyuşmuyor.";
    return null;
  }, [password, password2]);

  const formOk = useMemo(() => {
    return (
      !tokenErr &&
      !saving &&
      !done &&
      !pwErr &&
      password.trim().length > 0 &&
      password2.trim().length > 0 &&
      !confirmErr
    );
  }, [tokenErr, saving, done, pwErr, confirmErr, password, password2]);

  async function onSubmit() {
    setErr(null);

    if (tokenErr) return setErr(tokenErr);
    if (pwErr) return setErr(pwErr);
    if (password2 !== password) return setErr("Şifreler uyuşmuyor.");

    setSaving(true);
    try {
      // ✅ API endpointin:
      // POST /api/public/partner/set-password
      await apiJson<{ ok: boolean }>(`/api/public/partner/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: password.trim() }),
      });

      setDone(true);
    } catch (e: any) {
      setErr(e?.message ?? "Şifre kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (tokenErr) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-700">
        <div className="mb-1 inline-flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Hata
        </div>
        <div>{tokenErr}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-800">
        <div className="mb-1 inline-flex items-center gap-2 font-semibold">
          <Check className="h-4 w-4" />
          Tamamlandı
        </div>
        <div>
          Şifreniz başarıyla oluşturuldu. Artık sisteme giriş yapabilirsiniz.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-[--foreground]">
          Partner Girişini Tamamla
        </h1>
        <p className="mt-1 text-sm text-black/55">
          Şifrenizi belirleyip giriş adımlarını tamamlayın.
        </p>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-700">
          <div className="mb-1 inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Hata
          </div>
          <div>{err}</div>
        </div>
      )}

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-black/70">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:ring-4 focus:ring-black/5"
              placeholder="En az 6 karakter"
            />
            {pwErr && <div className="mt-1 text-xs text-red-700">{pwErr}</div>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black/70">
              Şifre Tekrar
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:ring-4 focus:ring-black/5"
              placeholder="Şifreyi tekrar gir"
            />
            {confirmErr && (
              <div className="mt-1 text-xs text-red-700">{confirmErr}</div>
            )}
          </div>

          <button
            onClick={onSubmit}
            disabled={!formOk}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm hover:bg-black/[0.03] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Şifreyi Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
