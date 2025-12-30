"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";

type CategoryDto = {
  id: number;
  categoryCode: string;
  parentCategoryID: number | null;
  isActive: boolean;
  sortOrder: number;
  name: string;
};

type CategoryDetail = {
  id: number;
  categoryCode: string;
  parentCategoryID: number | null;
  isActive: boolean;
  sortOrder: number;
  languages: { languageCode: string; categoryName: string }[];
};

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function getLangValue(langs: CategoryDetail["languages"], code: string) {
  return (
    langs.find((x) => x.languageCode.toLowerCase() === code)?.categoryName ?? ""
  );
}

export default function CategoriesClient() {
  const [lang] = useState<"tr" | "en">("tr");

  // list state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<CategoryDto[]>([]);

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
  const [categoryCode, setCategoryCode] = useState("");
  const [parentCategoryID, setParentCategoryID] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [nameTr, setNameTr] = useState("");
  const [nameEn, setNameEn] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const parentMap = useMemo(() => {
    const m = new Map<number, string>();
    items.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [items]);

  async function load(next?: { page?: number; pageSize?: number }) {
    const p = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    setLoading(true);
    setErr(null);

    try {
      const url =
        `/api/supervisor/categories?lang=${lang}` +
        `&page=${p}&pageSize=${ps}` +
        `&q=${encodeURIComponent(qDebounced.trim())}`;

      const r = await fetch(url, { cache: "no-store" });

      if (r.status === 401) {
        window.location.href = "/supervisor/login";
        return;
      }

      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error(d?.message ?? "Kategoriler yüklenemedi.");
      }

      const data = (await r.json()) as Paged<CategoryDto>;

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
    setCategoryCode("");
    setParentCategoryID(null);
    setSortOrder(0);
    setIsActive(true);
    setNameTr("");
    setNameEn("");
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
      const r = await fetch(`/api/supervisor/categories/${id}?lang=${lang}`, {
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

      const detail: CategoryDetail = {
        id: d.id ?? d.ID,
        categoryCode: d.categoryCode ?? d.CategoryCode,
        parentCategoryID: d.parentCategoryID ?? d.ParentCategoryID ?? null,
        isActive: d.isActive ?? d.IsActive,
        sortOrder: d.sortOrder ?? d.SortOrder,
        languages: (d.languages ?? d.Languages ?? []).map((x: any) => ({
          languageCode: x.languageCode ?? x.LanguageCode,
          categoryName: x.categoryName ?? x.CategoryName,
        })),
      };

      setCategoryCode(detail.categoryCode);
      setParentCategoryID(detail.parentCategoryID);
      setSortOrder(detail.sortOrder);
      setIsActive(detail.isActive);
      setNameTr(getLangValue(detail.languages, "tr"));
      setNameEn(getLangValue(detail.languages, "en"));
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    categoryCode.trim().length > 0 && nameTr.trim().length > 0 && !saving;

  async function onSubmit() {
    setErr(null);
    setSaving(true);

    const payload = {
      categoryCode: categoryCode.trim(),
      parentCategoryID,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
      languages: [
        { languageCode: "tr", categoryName: nameTr.trim() },
        { languageCode: "en", categoryName: nameEn.trim() || nameTr.trim() },
      ],
    };

    try {
      const url =
        mode === "create"
          ? `/api/supervisor/categories`
          : `/api/supervisor/categories/${editId}`;

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
      await load({ page: 1 }); // create/update sonrası ilk sayfaya dönmek daha net
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Kategoriyi kalıcı olarak silmek istiyor musun?")) return;

    setErr(null);
    try {
      const r = await fetch(`/api/supervisor/categories/${id}`, {
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

      // aynı sayfada kal: eğer son elemanı sildiysek sayfa düşebilir
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
            Kategoriler
          </h1>
          <p className="text-sm text-black/55">Ürün kategorilerini yönetin</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kategori ara (ad / kod)"
              className="w-full min-w-[240px] rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
            />
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[--spot-primary] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Yeni Kategori
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
              <th className="px-4 py-3">Kategori Adı</th>
              <th className="px-4 py-3">Kategori Kodu</th>
              <th className="px-4 py-3">Üst Kategori</th>
              {/* <th className="px-4 py-3 text-center">Sıra</th> */}
              <th className="px-4 py-3 text-center">Durum</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Yükleniyor...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-black/50"
                >
                  Kayıt bulunamadı
                </td>
              </tr>
            )}

            {!loading &&
              items.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-black/5 hover:bg-black/[0.015]"
                >
                  <td className="px-4 py-3 font-medium text-[--foreground]">
                    {c.name}
                  </td>

                  <td className="px-4 py-3 text-black/70">{c.categoryCode}</td>

                  <td className="px-4 py-3 text-black/60">
                    {c.parentCategoryID
                      ? parentMap.get(c.parentCategoryID) ?? "-"
                      : "-"}
                  </td>
                  {/* 
                  <td className="px-4 py-3 text-center">{c.sortOrder}</td> */}

                  <td className="px-4 py-3 text-center">
                    {c.isActive ? (
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
                        onClick={() => openEdit(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-black/70 hover:bg-black/5"
                      >
                        <Pencil className="h-4 w-4" />
                        Düzenle
                      </button>

                      <button
                        onClick={() => onDelete(c.id)}
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
                  {mode === "create" ? "Yeni Kategori" : "Kategori Düzenle"}
                </div>
                <div className="text-sm text-black/55"></div>
              </div>

              <button
                onClick={() => !saving && setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/[0.03]"
                aria-label="Kapat"
              >
                <X className="h-5 w-5 text-black/70" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {/* Kategori Kodu */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Kategori Kodu
                </label>
                <input
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  placeholder="Örn: CILT_BAKIM"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition
                 focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              {/* Kategori Adı (TR) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Kategori Adı (TR)
                </label>
                <input
                  value={nameTr}
                  onChange={(e) => setNameTr(e.target.value)}
                  placeholder="Örn: Cilt Bakım"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition
                 focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              {/* Üst Kategori */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Üst Kategori
                </label>
                <select
                  value={parentCategoryID ?? ""}
                  onChange={(e) =>
                    setParentCategoryID(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition
                 focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                >
                  <option value="">(Yok)</option>
                  {items.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer row: Aktif + Kaydet */}
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
