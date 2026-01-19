"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";

type ProductDto = {
  id: number;
  productCode: string;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
  name: string;
  primaryImageUrl: string | null;
  categoryIDs: number[];
  brandIDs: number[];

  stockQuantity?: number | null;
  unitPrice?: number | null;
  currencyID?: number | null;
};

type LookupItem = { id: number; name: string; isActive: boolean };

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

const currencyMap: Record<number, "TRY" | "USD" | "EUR"> = {
  1: "TRY",
  2: "USD",
  3: "EUR",
};

function currencyLabel(currencyID: number | null | undefined) {
  if (!currencyID) return "-";
  return currencyMap[currencyID] ?? `#${currencyID}`;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatInt(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "-";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
    value
  );
}

function joinNamesFromIds(
  ids: number[] | null | undefined,
  map: Map<number, string>
) {
  const arr = (ids ?? [])
    .map((id) => map.get(id))
    .filter((x): x is string => !!x && x.trim().length > 0);
  const text = arr.join(", ");
  return text.length > 0 ? text : "-";
}

function getPreviewPos(rect: DOMRect) {
  const gap = 12;
  const w = 320;
  const h = 320;

  let left = rect.right + gap;
  let top = rect.top - 6;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (left + w > vw - 8) left = rect.left - gap - w;

  if (top + h > vh - 8) top = vh - 8 - h;
  if (top < 8) top = 8;

  return { left: Math.round(left), top: Math.round(top), w, h };
}

// ✅ Tüm sayfaları gezerek lookup çek
async function fetchAllLookup(
  urlBase: string,
  pageSize = 500,
  maxPages = 200
): Promise<LookupItem[]> {
  const all: LookupItem[] = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await apiGet<any>(
      `${urlBase}&page=${page}&pageSize=${pageSize}&q=`
    );

    const items = (res?.items ?? res) as LookupItem[];
    const list = Array.isArray(items) ? items : [];
    all.push(...list);

    const totalPages: number | null =
      typeof res?.totalPages === "number" ? res.totalPages : null;

    // totalPages varsa onu kullan
    if (totalPages && page >= totalPages) break;

    // totalPages yoksa: pageSize'dan az geldiyse bitti varsay
    if (!totalPages && list.length < pageSize) break;

    page++;
  }

  // id bazlı uniq
  const m = new Map<number, LookupItem>();
  for (const x of all) if (x?.id != null) m.set(x.id, x);
  return Array.from(m.values());
}

export default function ProductsClient() {
  const [lang] = useState<"tr" | "en">("tr");

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<ProductDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(
    new Map()
  );
  const [brandMap, setBrandMap] = useState<Map<number, string>>(new Map());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [preview, setPreview] = useState<{
    src: string;
    alt: string;
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  // ✅ Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  function closeExportMenu() {
    setExportOpen(false);
  }

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // ✅ lookups (categories + brands) - tüm sayfaları çek
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [cats, brs] = await Promise.all([
          fetchAllLookup(`/api/supervisor/categories?lang=${lang}`),
          fetchAllLookup(`/api/supervisor/brands?lang=${lang}`),
        ]);

        if (cancelled) return;

        setCategoryMap(new Map((cats ?? []).map((c) => [c.id, c.name])));
        setBrandMap(new Map((brs ?? []).map((b) => [b.id, b.name])));
      } catch {
        // sessiz
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  async function load(next?: { page?: number; pageSize?: number }) {
    const p = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    setLoading(true);
    setErr(null);

    try {
      const url =
        `/api/supervisor/products?lang=${lang}` +
        `&page=${p}&pageSize=${ps}` +
        `&q=${encodeURIComponent(qDebounced.trim())}`;

      const data = await apiGet<Paged<ProductDto>>(url);

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

  function openDeleteModal(p: ProductDto) {
    setErr(null);
    setDeleteTarget({ id: p.id, name: p.name });
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
      await apiDelete(`/api/supervisor/products/${id}`);

      const wasOnlyOneOnPage = items.length === 1;
      const shouldGoPrev = wasOnlyOneOnPage && page > 1;
      const nextPage = shouldGoPrev ? page - 1 : page;

      setDeleteOpen(false);
      setDeleteTarget(null);

      await load({ page: nextPage });
    } catch (e: any) {
      setErr(e?.message ?? "Silme başarısız.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      onMouseLeave={() => setPreview(null)}
      onScrollCapture={() => {
        setPreview(null);
        closeExportMenu();
      }}
      onClickCapture={() => {
        if (exportOpen) closeExportMenu();
      }}
    >
      {preview && (
        <div
          className="pointer-events-none fixed z-[9999] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
          style={{
            left: preview.left,
            top: preview.top,
            width: preview.w,
            height: preview.h,
          }}
        >
          <div className="relative h-full w-full bg-black/[0.02]">
            <Image
              src={preview.src}
              alt={preview.alt}
              fill
              className="object-cover"
              sizes="320px"
              priority
            />
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">Ürünler</h1>
          <p className="text-sm text-black/55">Ürünlerinizi yönetin</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün ara (ad / kod / barkod)"
              className="w-full min-w-[260px] rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
            />
          </div>

          <Link
            href="/supervisor/products/import"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 shadow-sm hover:bg-black/[0.03]"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel ile Ürün Yükle
          </Link>

          {/* ✅ Dışa Aktar Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/70 shadow-sm hover:bg-black/[0.03]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Dışa Aktar
              <ChevronDown className="h-4 w-4 text-black/50" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
                <a
                  href={`/api/supervisor/exports/products?lang=${lang}`}
                  onClick={() => closeExportMenu()}
                  className="block px-4 py-3 text-sm text-black/75 hover:bg-black/[0.03]"
                >
                  Ürün
                </a>

                <a
                  href="/api/supervisor/exports/prices"
                  onClick={() => closeExportMenu()}
                  className="block px-4 py-3 text-sm text-black/75 hover:bg-black/[0.03]"
                >
                  Fiyat
                </a>

                <a
                  href="/api/supervisor/exports/stocks"
                  onClick={() => closeExportMenu()}
                  className="block px-4 py-3 text-sm text-black/75 hover:bg-black/[0.03]"
                >
                  Stok
                </a>
              </div>
            )}
          </div>

          <Link
            href="/supervisor/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--spot-primary] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </Link>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-black/60">
            <tr>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Barkod</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Marka</th>
              <th className="px-4 py-3 text-right">Fiyat</th>
              <th className="px-4 py-3 text-right">Toplam Stok</th>
              <th className="px-4 py-3 text-center">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && !hasAny && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Kayıt bulunamadı
                </td>
              </tr>
            )}

            {!loading &&
              items.map((p) => {
                const cur = currencyLabel(p.currencyID ?? null);
                const priceText = formatMoney(p.unitPrice ?? null);
                const priceWithCur =
                  priceText === "-"
                    ? "-"
                    : `${priceText} ${cur === "-" ? "" : cur}`.trim();

                const categoryText = joinNamesFromIds(
                  p.categoryIDs,
                  categoryMap
                );
                const brandText = joinNamesFromIds(p.brandIDs, brandMap);

                return (
                  <tr
                    key={p.id}
                    className="border-t border-black/5 hover:bg-black/[0.015]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative h-10 w-10 overflow-hidden rounded-xl border border-black/10 bg-black/[0.02]"
                          onMouseEnter={(e) => {
                            if (!p.primaryImageUrl) return;
                            const rect = (
                              e.currentTarget as HTMLDivElement
                            ).getBoundingClientRect();
                            const pos = getPreviewPos(rect);
                            setPreview({
                              src: p.primaryImageUrl,
                              alt: p.name,
                              ...pos,
                            });
                          }}
                          onMouseLeave={() => setPreview(null)}
                        >
                          {p.primaryImageUrl ? (
                            <Image
                              src={p.primaryImageUrl}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-black/40">
                              —
                            </div>
                          )}
                        </div>

                        <div className="leading-tight">
                          <div className="font-semibold text-[--foreground]">
                            {p.name}
                          </div>
                          <div className="text-xs text-black/45">#{p.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-black/70">{p.productCode}</td>

                    <td className="px-4 py-3 text-black/60">
                      {p.barcode?.trim() ? p.barcode : "-"}
                    </td>

                    <td className="px-4 py-3 text-black/70">{categoryText}</td>

                    <td className="px-4 py-3 text-black/70">{brandText}</td>

                    <td className="px-4 py-3 text-right font-semibold text-[--foreground]">
                      {priceWithCur}
                    </td>

                    <td className="px-4 py-3 text-right text-black/70">
                      {formatInt(p.stockQuantity ?? null)}
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
                        <Link
                          href={`/supervisor/products/${p.id}`}
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
                );
              })}
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
                    Ürünü sil
                  </div>
                  <div className="mt-1 text-sm text-black/55">
                    <span className="font-semibold text-[--foreground]">
                      {deleteTarget.name}
                    </span>{" "}
                    ürünü kalıcı olarak silinecek. Devam edilsin mi?
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
