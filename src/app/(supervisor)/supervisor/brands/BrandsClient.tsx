"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";

type BrandDto = {
  id: number;
  brandCode: string;
  isActive: boolean;
  sortOrder: number;
  name: string;
};

type BrandDetail = {
  id: number;
  brandCode: string;
  isActive: boolean;
  sortOrder: number;
  languages: { languageCode: string; brandName: string }[];
};

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function getLangValue(langs: BrandDetail["languages"], code: string) {
  return (
    langs.find((x) => x.languageCode.toLowerCase() === code)?.brandName ?? ""
  );
}

export default function BrandsClient() {
  const [lang] = useState<"tr" | "en">("tr");

  // list state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<BrandDto[]>([]);

  // pagination + search
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [brandCode, setBrandCode] = useState("");
  // const [sortOrder, setSortOrder] = useState<number>(0); // şimdilik gerek yok
  const [isActive, setIsActive] = useState(true);
  const [nameTr, setNameTr] = useState("");
  // const [nameEn, setNameEn] = useState(""); // şimdilik gerek yok

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function load(next?: { page?: number; pageSize?: number }) {
    const p = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    setLoading(true);
    setErr(null);

    try {
      const url =
        `/api/supervisor/brands?lang=${lang}` +
        `&page=${p}&pageSize=${ps}` +
        `&q=${encodeURIComponent(qDebounced.trim())}`;

      const r = await fetch(url, { cache: "no-store" });

      if (r.status === 401) {
        window.location.href = "/supervisor/login";
        return;
      }

      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message ?? "Markalar yüklenemedi.");
      }

      const data = (await r.json()) as Paged<BrandDto>;
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

  // first load
  useEffect(() => {
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // search changes -> reset page 1
  useEffect(() => {
    setPage(1);
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  function resetForm() {
    setBrandCode("");
    // setSortOrder(0);
    setIsActive(true);
    setNameTr("");
    // setNameEn("");
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    setMode("create");
    setOpen(true);
  }

  async function openEdit(id: number) {
    setErr(null);
    setMode("edit");
    setEditId(id);
    setOpen(true);
    setSaving(true);

    try {
      const r = await fetch(`/api/supervisor/brands/${id}?lang=${lang}`, {
        cache: "no-store",
      });

      if (r.status === 401) {
        window.location.href = "/supervisor/login";
        return;
      }

      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message ?? "Detay alınamadı.");
      }

      const d = (await r.json()) as any;

      const detail: BrandDetail = {
        id: d.id ?? d.ID,
        brandCode: d.brandCode ?? d.BrandCode,
        isActive: d.isActive ?? d.IsActive,
        sortOrder: d.sortOrder ?? d.SortOrder,
        languages: (d.languages ?? d.Languages ?? []).map((x: any) => ({
          languageCode: x.languageCode ?? x.LanguageCode,
          brandName: x.brandName ?? x.BrandName,
        })),
      };

      setBrandCode(detail.brandCode);
      // setSortOrder(detail.sortOrder);
      setIsActive(detail.isActive);
      setNameTr(getLangValue(detail.languages, "tr"));
      // setNameEn(getLangValue(detail.languages, "en"));
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    brandCode.trim().length > 0 && nameTr.trim().length > 0 && !saving;

  async function onSubmit() {
    setErr(null);
    setSaving(true);

    const payload = {
      brandCode: brandCode.trim(),
      // sortOrder: 0, // şimdilik sabit
      sortOrder: 0,
      isActive,
      languages: [
        { languageCode: "tr", brandName: nameTr.trim() },
        { languageCode: "en", brandName: nameTr.trim() }, // şimdilik TR ile aynı
      ],
    };

    try {
      const url =
        mode === "create"
          ? `/api/supervisor/brands`
          : `/api/supervisor/brands/${editId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.status === 401) {
        window.location.href = "/supervisor/login";
        return;
      }

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(data?.message ?? "Kaydetme başarısız.");
      }

      setOpen(false);
      await load({ page: 1 });
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Markayı kalıcı olarak silmek istiyor musun?")) return;

    setErr(null);

    try {
      const r = await fetch(`/api/supervisor/brands/${id}`, {
        method: "DELETE",
      });

      if (r.status === 401) {
        window.location.href = "/supervisor/login";
        return;
      }

      const d = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(d?.message ?? "Silme başarısız.");
      }

      const nextPage = Math.min(page, Math.max(1, totalPages));
      await load({ page: nextPage });
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Markalar
          </h1>
          <p className="text-sm text-black/55">Ürün markalarını yönetin</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Marka ara (ad / kod)"
              className="w-full min-w-[240px] rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition
                         focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
            />
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--spot-primary] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni Marka
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left text-black/60">
            <tr>
              <th className="px-4 py-3">Marka Adı</th>
              <th className="px-4 py-3">Marka Kodu</th>
              <th className="px-4 py-3 text-center">Durum</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Kayıt bulunamadı
                </td>
              </tr>
            )}

            {!loading &&
              items.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-black/5 hover:bg-black/[0.015]"
                >
                  <td className="px-4 py-3 font-medium text-[--foreground]">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-black/70">{b.brandCode}</td>

                  <td className="px-4 py-3 text-center">
                    {b.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Pasif
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-black/70 hover:bg-black/5"
                      >
                        <Pencil className="h-4 w-4" />
                        Düzenle
                      </button>

                      <button
                        onClick={() => onDelete(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-red-700 hover:bg-red-50"
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

      {/* Pagination */}
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

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setOpen(false)}
          />

          <div className="relative w-full max-w-xl rounded-3xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[--foreground]">
                  {mode === "create" ? "Yeni Marka" : "Marka Düzenle"}
                </div>
              </div>

              <button
                onClick={() => !saving && setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]"
                aria-label="Kapat"
              >
                <X className="h-5 w-5 text-black/70" />
              </button>
            </div>

            {/* Form */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Marka Kodu
                </label>
                <input
                  value={brandCode}
                  onChange={(e) => setBrandCode(e.target.value)}
                  placeholder="Örn: LOREAL"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition
                             focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Marka Adı (TR)
                </label>
                <input
                  value={nameTr}
                  onChange={(e) => setNameTr(e.target.value)}
                  placeholder="Örn: L'Oréal"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition
                             focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-black/70">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Aktif
                </label>

                <button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="
                    inline-flex items-center justify-center gap-2
                    rounded-2xl
                    border border-black/20
                    bg-white
                    px-4 py-3
                    text-sm font-semibold text-black
                    shadow-sm
                    transition
                    hover:border-[#845ec2]/50
                    hover:bg-[#fbeaff]/60
                    focus:outline-none
                    focus:ring-4 focus:ring-[#b39cd0]/30
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Kaydet" : "Güncelle"}
                </button>
              </div>
            </div>

            {saving && mode === "edit" && (
              <div className="mt-3 text-xs text-black/45">
                Detay yükleniyor / kaydediliyor...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
