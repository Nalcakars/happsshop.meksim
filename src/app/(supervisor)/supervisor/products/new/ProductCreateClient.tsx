"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, Search, Upload } from "lucide-react";

type LookupItem = { id: number; name: string; isActive: boolean };

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  let r = await fetch(url, { cache: "no-store", ...(init ?? {}) });

  if (r.status === 401) {
    const rr = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    if (rr.ok) r = await fetch(url, { cache: "no-store", ...(init ?? {}) });
  }

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "İstek başarısız.");
  return data as T;
}

export default function ProductCreateClient() {
  const router = useRouter();
  const [lang] = useState<"tr" | "en">("tr");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);

  const [productCode, setProductCode] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [selectedCategoryIDs, setSelectedCategoryIDs] = useState<number[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  const [brandID, setBrandID] = useState<number | null>(null);

  const [stockQty, setStockQty] = useState<number>(0);

  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await apiJson<any>(
          `/api/supervisor/categories?lang=${lang}&page=1&pageSize=500&q=`
        );
        const brRes = await apiJson<any>(
          `/api/supervisor/brands?lang=${lang}&page=1&pageSize=500&q=`
        );

        setCategories((catRes.items ?? catRes) as LookupItem[]);
        setBrands((brRes.items ?? brRes) as LookupItem[]);
      } catch (e: any) {
        setErr(e?.message ?? "Lookup yüklenemedi.");
      }
    })();
  }, [lang]);

  const canSubmit = useMemo(() => {
    return productCode.trim().length > 0 && nameTr.trim().length > 0 && !saving;
  }, [productCode, nameTr, saving]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name ?? "").toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const selectedCategoryChips = useMemo(() => {
    return selectedCategoryIDs
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean) as LookupItem[];
  }, [selectedCategoryIDs, categories]);

  function onPickFiles(nextFiles: File[]) {
    setFiles((prev) => [...prev, ...nextFiles]);
  }

  function removePickedFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImagesOneByOne(
    productId: number,
    filesToUpload: File[]
  ) {
    for (let i = 0; i < filesToUpload.length; i++) {
      const f = filesToUpload[i];
      const form = new FormData();
      form.append("file", f);

      await apiJson<any>(
        `/api/supervisor/products/${productId}/images?makePrimary=${
          i === 0 ? "true" : "false"
        }`,
        { method: "POST", body: form }
      );
    }
  }

  async function onSubmit() {
    setErr(null);
    setSaving(true);

    try {
      // ✅ Yeni fiyat kurgusu depo bazlı -> Create ekranında basic price yok.
      const payload = {
        productCode: productCode.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        isActive,

        categoryIDs: selectedCategoryIDs,
        brandIDs: brandID ? [brandID] : [],

        languages: [
          { languageCode: "tr", productName: nameTr.trim(), slug: null },
        ],
        descriptions: [],

        stockQuantity: Number.isFinite(stockQty) ? stockQty : 0,

        // ✅ eskiden vardı, artık null gönderiyoruz (DTO bozulmasın diye)
        unitPrice: null,
        currencyID: null,
        vatRate: null,
      };

      const created = await apiJson<{ id: number }>(
        `/api/supervisor/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const newId =
        (created as any).id ??
        (created as any).ID ??
        (created as any).productId;

      if (!newId) throw new Error("Ürün ID alınamadı.");

      if (files.length > 0) {
        await uploadImagesOneByOne(Number(newId), files);
      }

      // ✅ ürün oluşturuldu -> fiyatlar Edit ekranındaki Prices tabından girilecek
      router.replace("/supervisor/products");
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Yeni Ürün
          </h1>
          <p className="text-sm text-black/55">Ürün oluşturun</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            disabled={saving}
          >
            <X className="h-4 w-4" />
            Vazgeç
          </button>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Kaydet
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Ürün Kodu
                </label>
                <input
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Ürün Adı (TR)
                </label>
                <input
                  value={nameTr}
                  onChange={(e) => setNameTr(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  SKU
                </label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Barkod
                </label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-black/70">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Aktif
                </label>

                <div className="text-xs text-black/45">
                  Fiyatlar, ürünü oluşturduktan sonra{" "}
                  <b>Ürün Düzenle &gt; Prices</b> sekmesinden girilir.
                </div>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[--foreground]">
                Ürün Resimleri
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03]">
                <Upload className="h-4 w-4" />
                Resim Seç
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    onPickFiles(Array.from(e.target.files ?? []))
                  }
                />
              </label>
            </div>

            {files.length === 0 ? (
              <div className="text-sm text-black/50">Henüz dosya seçilmedi</div>
            ) : (
              <>
                <div className="mb-2 text-xs text-black/55">
                  {files.length} dosya seçildi. Kaydet’e basınca yüklenecek.
                </div>

                <div className="space-y-2">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-black/70">
                          {f.name}
                        </div>
                        <div className="text-xs text-black/45">
                          {(f.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removePickedFile(idx)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
                        disabled={saving}
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-[--foreground]">
              Kategoriler
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Kategori ara..."
                className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {selectedCategoryChips.length === 0 ? (
                <div className="text-sm text-black/50">Seçili kategori yok</div>
              ) : (
                selectedCategoryChips.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedCategoryIDs((s) => s.filter((x) => x !== c.id))
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
                    title="Kaldır"
                  >
                    {c.name}
                    <span className="text-black/40">×</span>
                  </button>
                ))
              )}
            </div>

            <div className="max-h-[280px] overflow-auto pr-1">
              <div className="space-y-1">
                {filteredCategories.map((c) => {
                  const checked = selectedCategoryIDs.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={[
                        "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                        checked
                          ? "border-[#845ec2]/25 bg-[#fbeaff]/40"
                          : "border-black/10 bg-white hover:bg-black/[0.02]",
                      ].join(" ")}
                    >
                      <span
                        className={
                          checked ? "font-semibold text-black" : "text-black/70"
                        }
                      >
                        {c.name}
                      </span>

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedCategoryIDs((s) =>
                            s.includes(c.id)
                              ? s.filter((x) => x !== c.id)
                              : [...s, c.id]
                          )
                        }
                      />
                    </label>
                  );
                })}

                {categories.length === 0 && (
                  <div className="text-sm text-black/50">Kategori yok</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-[--foreground]">
              Marka
            </div>

            <select
              value={brandID ?? ""}
              onChange={(e) =>
                setBrandID(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
            >
              <option value="">(Seçilmedi)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-black/50">Marka tek seçilir.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
