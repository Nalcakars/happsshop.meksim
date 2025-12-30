"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  Trash2,
  Upload,
  Star,
  X,
  Search,
} from "lucide-react";

type LookupItem = { id: number; name: string; isActive: boolean };

type ProductImageDto = {
  id: number;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
};

type ProductDetail = {
  id: number;
  productCode: string;
  sku: string | null;
  barcode: string | null;
  isActive: boolean;

  categoryIDs: number[];
  brandIDs: number[];

  nameTr: string;

  stockQuantity: number;
  unitPrice: number;
  currencyID: number;

  images: ProductImageDto[];
};

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

const currencyOptions = [
  { id: 1, code: "TRY" },
  { id: 2, code: "USD" },
  { id: 3, code: "EUR" },
] as const;

function normalizeProductDetail(d: any): ProductDetail {
  const id = d?.id ?? d?.ID;

  const langs = d?.languages ?? d?.Languages ?? [];
  const trName =
    langs.find(
      (x: any) => (x.languageCode ?? x.LanguageCode)?.toLowerCase() === "tr"
    )?.productName ??
    langs.find(
      (x: any) => (x.LanguageCode ?? x.languageCode)?.toLowerCase() === "tr"
    )?.ProductName ??
    d?.name ??
    d?.Name ??
    "";

  const imgsRaw = d?.images ?? d?.Images ?? [];
  const images: ProductImageDto[] = imgsRaw.map((x: any) => ({
    id: x.id ?? x.ID,
    imageUrl: x.imageUrl ?? x.ImageUrl,
    sortOrder: x.sortOrder ?? x.SortOrder ?? 0,
    isPrimary: x.isPrimary ?? x.IsPrimary ?? false,
    isActive: x.isActive ?? x.IsActive ?? true,
  }));

  const categoryIDs =
    d?.categoryIDs ??
    d?.CategoryIDs ??
    d?.categories?.map(
      (x: any) => x.categoryID ?? x.CategoryID ?? x.id ?? x.ID
    ) ??
    [];

  const brandIDs =
    d?.brandIDs ??
    d?.BrandIDs ??
    d?.brands?.map((x: any) => x.brandID ?? x.BrandID ?? x.id ?? x.ID) ??
    [];

  return {
    id,
    productCode: d?.productCode ?? d?.ProductCode ?? "",
    sku: d?.sku ?? d?.Sku ?? null,
    barcode: d?.barcode ?? d?.Barcode ?? null,
    isActive: d?.isActive ?? d?.IsActive ?? true,
    categoryIDs,
    brandIDs,
    nameTr: trName,
    stockQuantity: d?.stockQuantity ?? d?.StockQuantity ?? 0,
    unitPrice: d?.unitPrice ?? d?.UnitPrice ?? 0,
    currencyID: d?.currencyID ?? d?.CurrencyID ?? 1,
    images: images.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export default function ProductEditClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [lang] = useState<"tr" | "en">("tr");

  const [loading, setLoading] = useState(true);
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
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const [currencyID, setCurrencyID] = useState<number>(1);

  const [images, setImages] = useState<ProductImageDto[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const [catRes, brRes, prodRes, imgRes] = await Promise.all([
          apiJson<any>(
            `/api/supervisor/categories?lang=${lang}&page=1&pageSize=500&q=`
          ),
          apiJson<any>(
            `/api/supervisor/brands?lang=${lang}&page=1&pageSize=500&q=`
          ),
          apiJson<any>(`/api/supervisor/products/${id}?lang=${lang}`),
          apiJson<any>(`/api/supervisor/products/${id}/images`).catch(
            () => null
          ),
        ]);

        setCategories((catRes.items ?? catRes) as LookupItem[]);
        setBrands((brRes.items ?? brRes) as LookupItem[]);

        const detail = normalizeProductDetail(prodRes);

        setProductCode(detail.productCode);
        setNameTr(detail.nameTr);
        setSku(detail.sku ?? "");
        setBarcode(detail.barcode ?? "");
        setIsActive(detail.isActive);

        setSelectedCategoryIDs(detail.categoryIDs ?? []);
        setBrandID((detail.brandIDs ?? [])[0] ?? null);

        setStockQty(detail.stockQuantity ?? 0);
        setUnitPrice(detail.unitPrice ?? 0);

        const cid = detail.currencyID ?? 1;
        setCurrencyID(currencyOptions.some((x) => x.id === cid) ? cid : 1);

        if (imgRes) {
          const imgs = (imgRes.items ?? imgRes) as any[];
          const normalized: ProductImageDto[] = (imgs ?? []).map((x: any) => ({
            id: x.id ?? x.ID,
            imageUrl: x.imageUrl ?? x.ImageUrl,
            sortOrder: x.sortOrder ?? x.SortOrder ?? 0,
            isPrimary: x.isPrimary ?? x.IsPrimary ?? false,
            isActive: x.isActive ?? x.IsActive ?? true,
          }));
          setImages(normalized.sort((a, b) => a.sortOrder - b.sortOrder));
        } else {
          setImages(detail.images ?? []);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Hata oluştu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, lang]);

  const canSubmit = useMemo(() => {
    return (
      productCode.trim().length > 0 &&
      nameTr.trim().length > 0 &&
      !saving &&
      !loading
    );
  }, [productCode, nameTr, saving, loading]);

  async function reloadImages() {
    try {
      const imgRes = await apiJson<any>(
        `/api/supervisor/products/${id}/images`
      );
      const imgs = (imgRes.items ?? imgRes) as any[];
      const normalized: ProductImageDto[] = (imgs ?? []).map((x: any) => ({
        id: x.id ?? x.ID,
        imageUrl: x.imageUrl ?? x.ImageUrl,
        sortOrder: x.sortOrder ?? x.SortOrder ?? 0,
        isPrimary: x.isPrimary ?? x.IsPrimary ?? false,
        isActive: x.isActive ?? x.IsActive ?? true,
      }));
      setImages(normalized.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      // no-op
    }
  }

  async function uploadImagesOneByOne(productId: string, files: File[]) {
    // makePrimary: ilk görsel true, devamı false
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const form = new FormData();
      form.append("file", f); // ✅ backend ve route bunu bekliyor

      await apiJson<any>(
        `/api/supervisor/products/${productId}/images?makePrimary=${
          i === 0 ? "true" : "false"
        }`,
        {
          method: "POST",
          body: form,
        }
      );
    }
  }

  async function onSave() {
    if (!id) return;
    setErr(null);
    setSaving(true);

    try {
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
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        currencyID: Number.isFinite(currencyID) ? currencyID : 1,
      };

      await apiJson<any>(`/api/supervisor/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (uploadFiles.length > 0) {
        await uploadImagesOneByOne(id, uploadFiles);
        setUploadFiles([]);
        await reloadImages();
      }
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteImage(imageId: number) {
    if (!id) return;
    if (!confirm("Resmi silmek istiyor musun?")) return;

    setErr(null);
    try {
      await apiJson<any>(`/api/supervisor/products/${id}/images/${imageId}`, {
        method: "DELETE",
      });
      await reloadImages();
    } catch (e: any) {
      setErr(e?.message ?? "Resim silinemedi.");
    }
  }

  async function onMakePrimary(imageId: number) {
    if (!id) return;
    setErr(null);
    try {
      // backend PUT: /primary
      await apiJson<any>(
        `/api/supervisor/products/${id}/images/${imageId}/primary`,
        { method: "PUT" }
      );
      await reloadImages();
    } catch (e: any) {
      setErr(e?.message ?? "Primary yapılamadı.");
    }
  }

  async function onMove(imageId: number, dir: -1 | 1) {
    const idx = images.findIndex((x) => x.id === imageId);
    if (idx < 0) return;

    const next = [...images];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;

    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const normalized = next.map((x, i) => ({ ...x, sortOrder: (i + 1) * 10 }));
    setImages(normalized);

    try {
      // backend: PUT /reorder ve body List<ReorderItem>
      await apiJson<any>(`/api/supervisor/products/${id}/images/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          normalized.map((x) => ({ imageId: x.id, sortOrder: x.sortOrder }))
        ),
      });
      await reloadImages();
    } catch (e: any) {
      setErr(e?.message ?? "Sıralama kaydedilemedi.");
    }
  }

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

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-black/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Ürün Düzenle
          </h1>
          <p className="text-sm text-black/55">Ürün bilgilerini güncelle</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
          >
            <X className="h-4 w-4" />
            Geri
          </button>

          <button
            onClick={onSave}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
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

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Stok
                </label>
                <input
                  type="number"
                  value={stockQty}
                  onChange={(e) =>
                    setStockQty(parseInt(e.target.value || "0", 10))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Fiyat
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) =>
                      setUnitPrice(parseFloat(e.target.value || "0"))
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Para Birimi
                  </label>
                  <select
                    value={currencyID}
                    onChange={(e) =>
                      setCurrencyID(parseInt(e.target.value || "1", 10))
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  >
                    {currencyOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
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
                    setUploadFiles(Array.from(e.target.files ?? []))
                  }
                />
              </label>
            </div>

            {uploadFiles.length > 0 && (
              <div className="mb-3 text-xs text-black/55">
                {uploadFiles.length} dosya seçildi. Kaydet’e basınca yüklenecek.
              </div>
            )}

            {images.length === 0 ? (
              <div className="text-sm text-black/50">Henüz resim yok</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                  >
                    <div className="relative aspect-square bg-black/[0.02]">
                      <Image
                        src={img.imageUrl}
                        alt="Product image"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />

                      {img.isPrimary && (
                        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-black shadow-sm">
                          <Star className="h-3.5 w-3.5" />
                          Ana Resim
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-black/50">
                          Sıra:{" "}
                          <span className="font-semibold text-black">
                            {img.sortOrder}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onMove(img.id, -1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/[0.03]"
                            title="Yukarı"
                          >
                            <ArrowUp className="h-4 w-4 text-black/70" />
                          </button>

                          <button
                            onClick={() => onMove(img.id, 1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 hover:bg-black/[0.03]"
                            title="Aşağı"
                          >
                            <ArrowDown className="h-4 w-4 text-black/70" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onMakePrimary(img.id)}
                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-[#fbeaff]/60"
                        >
                          Ana Resim Yap
                        </button>

                        <button
                          onClick={() => onDeleteImage(img.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Categories */}
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

            <div className="max-h-[320px] overflow-auto pr-1">
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

          {/* Brand */}
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
