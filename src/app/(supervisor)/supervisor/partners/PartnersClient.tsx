"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
  Check,
  MessageCircle,
  Loader2,
} from "lucide-react";

type DealerListItemDto = {
  id: number;
  dealerCode: string;
  dealerName: string;
  commissionRate: number;
  isActive: boolean;
  createdAt: string;
  city?: string | null;
  district?: string | null;
};

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

async function apiGet<T>(url: string): Promise<T> {
  let r = await fetch(url, { cache: "no-store" });

  if (r.status === 401) {
    const rr = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    if (rr.ok) r = await fetch(url, { cache: "no-store" });
  }

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "İstek başarısız.");
  return data as T;
}

async function apiDelete(url: string): Promise<void> {
  let r = await fetch(url, { method: "DELETE" });

  if (r.status === 401) {
    const rr = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    if (rr.ok) r = await fetch(url, { method: "DELETE" });
  }

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "Silme başarısız.");
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  let r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  if (r.status === 401) {
    const rr = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    if (rr.ok) {
      r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        cache: "no-store",
      });
    }
  }

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "İstek başarısız.");
  return data as T;
}

function fmtPercent(v: number) {
  if (!Number.isFinite(v)) return "-";
  return (
    new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(v) + "%"
  );
}

export default function PartnersClient() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [items, setItems] = useState<DealerListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // whatsapp invite
  const [invitingId, setInvitingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const msg = sessionStorage.getItem("happs.toast");
    if (msg) {
      sessionStorage.removeItem("happs.toast");
      setToast(msg);
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  async function load(next?: { page?: number; pageSize?: number }) {
    const p = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    setLoading(true);
    setErr(null);

    try {
      const url =
        `/api/supervisor/dealers` +
        `?page=${p}&pageSize=${ps}` +
        `&q=${encodeURIComponent(qDebounced.trim())}`;

      const data = await apiGet<Paged<DealerListItemDto>>(url);

      setItems(data.items ?? []);
      setPage(data.page ?? p);
      setPageSize(data.pageSize ?? ps);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const hasAny = useMemo(() => items.length > 0, [items]);

  function openDeleteModal(p: DealerListItemDto) {
    setErr(null);
    setDeleteTarget({ id: p.id, name: p.dealerName });
    setDeleteOpen(true);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    setErr(null);
    setDeletingId(id);

    try {
      await apiDelete(`/api/supervisor/dealers/${id}`);

      const wasOnlyOneOnPage = items.length === 1;
      const shouldGoPrev = wasOnlyOneOnPage && page > 1;
      const nextPage = shouldGoPrev ? page - 1 : page;

      setDeleteOpen(false);
      setDeleteTarget(null);

      await load({ page: nextPage });
      setToast("Partner silindi.");
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    } catch (e: any) {
      setErr(e?.message ?? "Silme başarısız.");
    } finally {
      setDeletingId(null);
    }
  }

  async function sendInvite(dealerId: number) {
    if (invitingId) return; // aynı anda 2 davet basılmasın

    setErr(null);
    setToast(null);
    setInvitingId(dealerId);

    try {
      await apiPost<{ ok: boolean }>(`/api/partner-login/send-invite`, {
        dealerId,
      });

      setToast("WhatsApp daveti gönderildi.");
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    } catch (e: any) {
      setErr(e?.message ?? "Davet gönderilemedi.");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Partnerler
          </h1>
          <p className="text-sm text-black/55"></p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara"
              className="w-full min-w-[260px] rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
            />
          </div>

          <Link
            href="/supervisor/partners/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--spot-primary] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni Partner
          </Link>
        </div>
      </div>

      {toast && (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" />
            {toast}
          </span>
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-black/60">
            <tr>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">İl</th>
              <th className="px-4 py-3">İlçe</th>
              <th className="px-4 py-3">Komisyon</th>
              <th className="px-4 py-3 text-center">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && !hasAny && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Kayıt bulunamadı
                </td>
              </tr>
            )}

            {!loading &&
              items.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-black/5 hover:bg-black/[0.015]"
                >
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <div className="font-semibold text-[--foreground]">
                        {p.dealerName}
                      </div>
                      <div className="text-xs text-black/45">#{p.id}</div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-black/70">{p.dealerCode}</td>

                  <td className="px-4 py-3 text-black/70">{p.city ?? "-"}</td>

                  <td className="px-4 py-3 text-black/70">
                    {p.district ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-black/70">
                    {fmtPercent(p.commissionRate)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {p.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Pasif
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => sendInvite(p.id)}
                        disabled={loading || invitingId !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-white px-3 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        title="WhatsApp daveti gönder"
                      >
                        {invitingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        WhatsApp
                      </button>

                      <Link
                        href={`/supervisor/partners/${p.id}`}
                        className="rounded-lg px-3 py-1 text-sm text-black/70 hover:bg-black/5"
                      >
                        Düzenle
                      </Link>

                      <button
                        onClick={() => openDeleteModal(p)}
                        disabled={deletingId === p.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-white px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-black/55">
          Toplam{" "}
          <span className="font-semibold text-[--foreground]">{total}</span>{" "}
          kayıt • Sayfa{" "}
          <span className="font-semibold text-[--foreground]">{page}</span> /{" "}
          {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              const ps = Number(e.target.value);
              setPageSize(ps);
              setPage(1);
              void load({ page: 1, pageSize: ps });
            }}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/sayfa
              </option>
            ))}
          </select>

          <button
            disabled={page <= 1 || loading}
            onClick={() => void load({ page: page - 1 })}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Önceki
          </button>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => void load({ page: page + 1 })}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>

      {deleteOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-red-500/20 bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>

                <div>
                  <div className="text-lg font-semibold text-[--foreground]">
                    Partneri sil
                  </div>
                  <div className="mt-1 text-sm text-black/55">
                    <span className="font-semibold text-[--foreground]">
                      {deleteTarget.name}
                    </span>{" "}
                    kalıcı olarak silinecek. Devam edilsin mi?
                  </div>
                </div>
              </div>

              <button
                onClick={closeDeleteModal}
                className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03] disabled:opacity-50"
                aria-label="Kapat"
                disabled={!!deletingId}
              >
                <X className="h-5 w-5 text-black/70" />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black/[0.03] disabled:opacity-50"
              >
                Vazgeç
              </button>

              <button
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
