"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Ruler,
  Link as LinkIcon,
  RotateCcw,
  BadgeDollarSign,
  Plus,
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

  images: ProductImageDto[];
};

type ProductDimensionsDto = {
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  desi: number | null;
} | null;

type ProductAdditionalsDto = {
  otherLink1: string | null;
  otherLink2: string | null;
  otherLink3: string | null;
  origin: string | null;
  servicePhoneNumber: string | null;
  warranty: string | null;
} | null;

type PriceDto = {
  id: number;
  productID: number;
  currencyID: number;
  warehouseID: number;

  costPrice: number | null;
  listPrice: number | null;
  priceValue: number | null;

  otherPrice1: number | null;
  otherPrice2: number | null;
  otherPrice3: number | null;

  taxRatio: number; // zorunlu
  inTax: boolean;

  logisticCost: number | null;
  porterageCost: number | null;

  profitRatio: number | null;

  cashRatio: number | null;
  ccSingleRatio: number | null;
  ccInstallmentRatio: number | null;
  deferredRatio: number | null;

  createdAt?: string;
  updatedAt?: string | null;
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

async function fetchAllLookup(
  urlBase: string,
  pageSize = 500,
  maxPages = 200
): Promise<LookupItem[]> {
  const all: LookupItem[] = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await apiJson<any>(
      `${urlBase}&page=${page}&pageSize=${pageSize}&q=`
    );

    const items = (res?.items ?? res) as LookupItem[];
    const list = Array.isArray(items) ? items : [];
    all.push(...list);

    const totalPages: number | null =
      typeof res?.totalPages === "number" ? res.totalPages : null;

    if (totalPages && page >= totalPages) break;
    if (!totalPages && list.length < pageSize) break;

    page++;
  }

  const m = new Map<number, LookupItem>();
  for (const x of all) if (x?.id != null) m.set(x.id, x);
  return Array.from(m.values());
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
  const images: ProductImageDto[] = (imgsRaw ?? []).map((x: any) => ({
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
    images: images.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

type TabKey = "general" | "images" | "prices" | "dimensions" | "additionals";

function nOrNull(v: string): number | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function fmtMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(v);
}

function safeMul(a: number | null, b: number | null) {
  if (a == null || b == null) return null;
  const r = a * b;
  return Number.isFinite(r) ? r : null;
}

export default function ProductEditClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [lang] = useState<"tr" | "en">("tr");
  const [tab, setTab] = useState<TabKey>("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDims, setSavingDims] = useState(false);
  const [savingAdds, setSavingAdds] = useState(false);

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

  const [images, setImages] = useState<ProductImageDto[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // Dimensions
  const [dimLength, setDimLength] = useState<string>("");
  const [dimWidth, setDimWidth] = useState<string>("");
  const [dimHeight, setDimHeight] = useState<string>("");
  const [dimWeight, setDimWeight] = useState<string>("");
  const [dimDesi, setDimDesi] = useState<string>("");

  // Additionals
  const [otherLink1, setOtherLink1] = useState<string>("");
  const [otherLink2, setOtherLink2] = useState<string>("");
  const [otherLink3, setOtherLink3] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [servicePhoneNumber, setServicePhoneNumber] = useState<string>("");
  const [warranty, setWarranty] = useState<string>("");

  // Prices
  const [warehouses, setWarehouses] = useState<LookupItem[]>([]);
  const [prices, setPrices] = useState<PriceDto[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);

  const [mode, setMode] = useState<"ratio" | "manual">("ratio");

  // price form fields (string)
  const [pWarehouseID, setPWarehouseID] = useState<string>("");
  const [pCurrencyID, setPCurrencyID] = useState<string>("1");

  const [pCostPrice, setPCostPrice] = useState<string>("");
  const [pListPrice, setPListPrice] = useState<string>("");
  const [pPriceValue, setPPriceValue] = useState<string>("");

  const [pOther1, setPOther1] = useState<string>("");
  const [pOther2, setPOther2] = useState<string>("");
  const [pOther3, setPOther3] = useState<string>("");

  const [pTaxRatio, setPTaxRatio] = useState<string>("20");
  const [pInTax, setPInTax] = useState<boolean>(true);

  const [pLogisticCost, setPLogisticCost] = useState<string>("");
  const [pPorterageCost, setPPorterageCost] = useState<string>("");
  const [pProfitRatio, setPProfitRatio] = useState<string>("");

  const [pCashRatio, setPCashRatio] = useState<string>("");
  const [pCcSingleRatio, setPCcSingleRatio] = useState<string>("");
  const [pCcInstallmentRatio, setPCcInstallmentRatio] = useState<string>("");
  const [pDeferredRatio, setPDeferredRatio] = useState<string>("");

  function setDimsFromDto(dto: ProductDimensionsDto) {
    setDimLength(dto?.length != null ? String(dto.length) : "");
    setDimWidth(dto?.width != null ? String(dto.width) : "");
    setDimHeight(dto?.height != null ? String(dto.height) : "");
    setDimWeight(dto?.weight != null ? String(dto.weight) : "");
    setDimDesi(dto?.desi != null ? String(dto.desi) : "");
  }

  function setAddsFromDto(dto: ProductAdditionalsDto) {
    setOtherLink1(dto?.otherLink1 ?? "");
    setOtherLink2(dto?.otherLink2 ?? "");
    setOtherLink3(dto?.otherLink3 ?? "");
    setOrigin(dto?.origin ?? "");
    setServicePhoneNumber(dto?.servicePhoneNumber ?? "");
    setWarranty(dto?.warranty ?? "");
  }

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

  async function reloadDims() {
    try {
      const d = await apiJson<ProductDimensionsDto>(
        `/api/supervisor/products/${id}/dimensions`
      );
      setDimsFromDto(d ?? null);
    } catch {
      // no-op
    }
  }

  async function reloadAdds() {
    try {
      const a = await apiJson<ProductAdditionalsDto>(
        `/api/supervisor/products/${id}/additionals`
      );
      setAddsFromDto(a ?? null);
    } catch {
      // no-op
    }
  }

  async function reloadPrices() {
    if (!id) return;
    setPricesLoading(true);
    try {
      const res = await apiJson<any>(
        `/api/supervisor/products/${id}/prices?lang=${lang}`
      );
      const list = (res?.items ?? res) as any[];
      const normalized: PriceDto[] = (list ?? []).map((x: any) => ({
        id: x.id ?? x.ID,
        productID: x.productID ?? x.ProductID,
        currencyID: x.currencyID ?? x.CurrencyID,
        warehouseID: x.warehouseID ?? x.WarehouseID,

        costPrice: x.costPrice ?? x.CostPrice ?? null,
        listPrice: x.listPrice ?? x.ListPrice ?? null,
        priceValue: x.priceValue ?? x.PriceValue ?? x.price ?? x.Price ?? null,

        otherPrice1: x.otherPrice1 ?? x.OtherPrice1 ?? null,
        otherPrice2: x.otherPrice2 ?? x.OtherPrice2 ?? null,
        otherPrice3: x.otherPrice3 ?? x.OtherPrice3 ?? null,

        taxRatio: x.taxRatio ?? x.TaxRatio ?? 0,
        inTax: x.inTax ?? x.InTax ?? false,

        logisticCost: x.logisticCost ?? x.LogisticCost ?? null,
        porterageCost: x.porterageCost ?? x.PorterageCost ?? null,

        profitRatio: x.profitRatio ?? x.ProfitRatio ?? null,

        cashRatio: x.cashRatio ?? x.CashRatio ?? null,
        ccSingleRatio: x.ccSingleRatio ?? x.CcSingleRatio ?? null,
        ccInstallmentRatio:
          x.ccInstallmentRatio ?? x.CcInstallmentRatio ?? null,
        deferredRatio: x.deferredRatio ?? x.DeferredRatio ?? null,

        createdAt: x.createdAt ?? x.CreatedAt,
        updatedAt: x.updatedAt ?? x.UpdatedAt ?? null,
      }));

      // sort: warehouse then currency
      normalized.sort(
        (a, b) => a.warehouseID - b.warehouseID || a.currencyID - b.currencyID
      );
      setPrices(normalized);
    } catch (e: any) {
      setErr(e?.message ?? "Fiyatlar yüklenemedi.");
    } finally {
      setPricesLoading(false);
    }
  }

  function resetPriceForm() {
    setEditingPriceId(null);
    setMode("ratio");

    setPWarehouseID("");
    setPCurrencyID("1");

    setPCostPrice("");
    setPListPrice("");
    setPPriceValue("");

    setPOther1("");
    setPOther2("");
    setPOther3("");

    setPTaxRatio("20");
    setPInTax(true);

    setPLogisticCost("");
    setPPorterageCost("");
    setPProfitRatio("");

    setPCashRatio("");
    setPCcSingleRatio("");
    setPCcInstallmentRatio("");
    setPDeferredRatio("");
  }

  function openCreatePrice() {
    resetPriceForm();
    // default warehouse: first active
    const firstW = warehouses.find((w) => w.isActive) ?? warehouses[0];
    if (firstW) setPWarehouseID(String(firstW.id));
    setPriceModalOpen(true);
  }

  function openEditPrice(p: PriceDto) {
    setEditingPriceId(p.id);

    // Mode inference:
    // Eğer profit/logistic/porterage dolu ve priceValue boşsa ratio; aksi durumda manual
    const inferredMode =
      p.priceValue == null &&
      (p.profitRatio != null ||
        p.logisticCost != null ||
        p.porterageCost != null)
        ? "ratio"
        : "manual";
    setMode(inferredMode);

    setPWarehouseID(String(p.warehouseID));
    setPCurrencyID(String(p.currencyID));

    setPCostPrice(p.costPrice != null ? String(p.costPrice) : "");
    setPListPrice(p.listPrice != null ? String(p.listPrice) : "");
    setPPriceValue(p.priceValue != null ? String(p.priceValue) : "");

    setPOther1(p.otherPrice1 != null ? String(p.otherPrice1) : "");
    setPOther2(p.otherPrice2 != null ? String(p.otherPrice2) : "");
    setPOther3(p.otherPrice3 != null ? String(p.otherPrice3) : "");

    setPTaxRatio(String(p.taxRatio ?? 0));
    setPInTax(!!p.inTax);

    setPLogisticCost(p.logisticCost != null ? String(p.logisticCost) : "");
    setPPorterageCost(p.porterageCost != null ? String(p.porterageCost) : "");
    setPProfitRatio(p.profitRatio != null ? String(p.profitRatio) : "");

    setPCashRatio(p.cashRatio != null ? String(p.cashRatio) : "");
    setPCcSingleRatio(p.ccSingleRatio != null ? String(p.ccSingleRatio) : "");
    setPCcInstallmentRatio(
      p.ccInstallmentRatio != null ? String(p.ccInstallmentRatio) : ""
    );
    setPDeferredRatio(p.deferredRatio != null ? String(p.deferredRatio) : "");

    setPriceModalOpen(true);
  }

  const computedBasePrice = useMemo(() => {
    const cost = nOrNull(pCostPrice);
    const pr = nOrNull(pProfitRatio);
    const log = nOrNull(pLogisticCost) ?? 0;
    const port = nOrNull(pPorterageCost) ?? 0;
    if (cost == null || pr == null) return null;

    // (Maliyet + yüzde(karlilik)) + Lojistik + Hammaliye
    const price = cost + cost * (pr / 100) + log + port;
    return Number.isFinite(price) ? price : null;
  }, [pCostPrice, pProfitRatio, pLogisticCost, pPorterageCost]);

  const effectivePriceValue = useMemo(() => {
    if (mode === "ratio") return computedBasePrice;
    return nOrNull(pPriceValue);
  }, [mode, computedBasePrice, pPriceValue]);

  const derivedCash = useMemo(
    () => safeMul(effectivePriceValue, nOrNull(pCashRatio)),
    [effectivePriceValue, pCashRatio]
  );
  const derivedSingle = useMemo(
    () => safeMul(effectivePriceValue, nOrNull(pCcSingleRatio)),
    [effectivePriceValue, pCcSingleRatio]
  );
  const derivedInstallment = useMemo(
    () => safeMul(effectivePriceValue, nOrNull(pCcInstallmentRatio)),
    [effectivePriceValue, pCcInstallmentRatio]
  );
  const derivedDeferred = useMemo(
    () => safeMul(effectivePriceValue, nOrNull(pDeferredRatio)),
    [effectivePriceValue, pDeferredRatio]
  );

  async function savePrice() {
    if (!id) return;

    const wid = Number(pWarehouseID);
    const cid = Number(pCurrencyID);
    if (!Number.isFinite(wid) || wid <= 0) {
      setErr("Depo seçimi zorunlu.");
      return;
    }
    if (!Number.isFinite(cid) || cid <= 0) {
      setErr("Para birimi seçimi zorunlu.");
      return;
    }

    setErr(null);
    setPriceSaving(true);

    try {
      // ✅ null rules:
      // manual modda logistic/porterage/profit boşsa null gönder
      // ratio modda priceValue hesaplanır ve DB'ye PriceValue kaydedilecek
      const payload = {
        warehouseID: wid,
        currencyID: cid,

        costPrice: nOrNull(pCostPrice),
        listPrice: nOrNull(pListPrice),

        // ✅ PriceValue
        priceValue: effectivePriceValue,

        otherPrice1: nOrNull(pOther1),
        otherPrice2: nOrNull(pOther2),
        otherPrice3: nOrNull(pOther3),

        taxRatio: nOrNull(pTaxRatio) ?? 0,
        inTax: !!pInTax,

        logisticCost:
          mode === "manual" ? nOrNull(pLogisticCost) : nOrNull(pLogisticCost),
        porterageCost:
          mode === "manual" ? nOrNull(pPorterageCost) : nOrNull(pPorterageCost),
        profitRatio:
          mode === "manual" ? nOrNull(pProfitRatio) : nOrNull(pProfitRatio),

        cashRatio: nOrNull(pCashRatio),
        ccSingleRatio: nOrNull(pCcSingleRatio),
        ccInstallmentRatio: nOrNull(pCcInstallmentRatio),
        deferredRatio: nOrNull(pDeferredRatio),
      };

      if (editingPriceId) {
        await apiJson<any>(
          `/api/supervisor/products/${id}/prices/${editingPriceId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiJson<any>(`/api/supervisor/products/${id}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setPriceModalOpen(false);
      resetPriceForm();
      await reloadPrices();
    } catch (e: any) {
      setErr(e?.message ?? "Fiyat kaydedilemedi.");
    } finally {
      setPriceSaving(false);
    }
  }

  async function deletePrice(priceId: number) {
    if (!id) return;
    if (!confirm("Bu fiyat kaydını silmek istiyor musun?")) return;

    setErr(null);
    try {
      await apiJson<any>(`/api/supervisor/products/${id}/prices/${priceId}`, {
        method: "DELETE",
      });
      await reloadPrices();
    } catch (e: any) {
      setErr(e?.message ?? "Fiyat silinemedi.");
    }
  }

  async function uploadImagesOneByOne(productId: string, files: File[]) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
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

  async function onSaveGeneralAndImages() {
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

        // ✅ yeni kurgu: fiyatlar Prices tabından
        unitPrice: null,
        currencyID: null,
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

  async function onSaveDimensions() {
    if (!id) return;
    setErr(null);
    setSavingDims(true);

    try {
      const payload = {
        length: nOrNull(dimLength),
        width: nOrNull(dimWidth),
        height: nOrNull(dimHeight),
        weight: nOrNull(dimWeight),
        desi: nOrNull(dimDesi),
      };

      await apiJson<any>(`/api/supervisor/products/${id}/dimensions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await reloadDims();
    } catch (e: any) {
      setErr(e?.message ?? "Ölçüler kaydedilemedi.");
    } finally {
      setSavingDims(false);
    }
  }

  async function onClearDimensions() {
    if (!id) return;
    if (!confirm("Ölçüleri temizlemek istiyor musun?")) return;

    setErr(null);
    setSavingDims(true);
    try {
      await apiJson<any>(`/api/supervisor/products/${id}/dimensions`, {
        method: "DELETE",
      });
      setDimsFromDto(null);
    } catch (e: any) {
      setErr(e?.message ?? "Ölçüler silinemedi.");
    } finally {
      setSavingDims(false);
    }
  }

  function trimOrNull(v: string): string | null {
    const t = (v ?? "").trim();
    return t ? t : null;
  }

  async function onSaveAdditionals() {
    if (!id) return;
    setErr(null);
    setSavingAdds(true);

    try {
      const payload = {
        otherLink1: trimOrNull(otherLink1),
        otherLink2: trimOrNull(otherLink2),
        otherLink3: trimOrNull(otherLink3),
        origin: trimOrNull(origin),
        servicePhoneNumber: trimOrNull(servicePhoneNumber),
        warranty: trimOrNull(warranty),
      };

      await apiJson<any>(`/api/supervisor/products/${id}/additionals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await reloadAdds();
    } catch (e: any) {
      setErr(e?.message ?? "Ek bilgiler kaydedilemedi.");
    } finally {
      setSavingAdds(false);
    }
  }

  async function onClearAdditionals() {
    if (!id) return;
    if (!confirm("Ek bilgileri temizlemek istiyor musun?")) return;

    setErr(null);
    setSavingAdds(true);
    try {
      await apiJson<any>(`/api/supervisor/products/${id}/additionals`, {
        method: "DELETE",
      });
      setAddsFromDto(null);
    } catch (e: any) {
      setErr(e?.message ?? "Ek bilgiler silinemedi.");
    } finally {
      setSavingAdds(false);
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
      await apiJson<any>(`/api/supervisor/products/${id}/images/sort`, {
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

  // lookups + product load
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const [cats, brs, whs, prodRes, imgRes, dimsRes, addsRes] =
          await Promise.all([
            fetchAllLookup(`/api/supervisor/categories?lang=${lang}`),
            fetchAllLookup(`/api/supervisor/brands?lang=${lang}`),
            fetchAllLookup(`/api/supervisor/warehouses?lang=${lang}`),
            apiJson<any>(`/api/supervisor/products/${id}?lang=${lang}`),
            apiJson<any>(`/api/supervisor/products/${id}/images`).catch(
              () => null
            ),
            apiJson<ProductDimensionsDto>(
              `/api/supervisor/products/${id}/dimensions`
            ).catch(() => null),
            apiJson<ProductAdditionalsDto>(
              `/api/supervisor/products/${id}/additionals`
            ).catch(() => null),
          ]);

        if (cancelled) return;

        setCategories(cats ?? []);
        setBrands(brs ?? []);
        setWarehouses((whs ?? []).filter((x) => x && x.id != null));

        const detail = normalizeProductDetail(prodRes);

        setProductCode(detail.productCode);
        setNameTr(detail.nameTr);
        setSku(detail.sku ?? "");
        setBarcode(detail.barcode ?? "");
        setIsActive(detail.isActive);

        setSelectedCategoryIDs(detail.categoryIDs ?? []);
        setBrandID((detail.brandIDs ?? [])[0] ?? null);

        setStockQty(detail.stockQuantity ?? 0);

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

        setDimsFromDto(dimsRes ?? null);
        setAddsFromDto(addsRes ?? null);

        // prices
        await reloadPrices();
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Hata oluştu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, lang]);

  const canSubmit = useMemo(() => {
    return (
      productCode.trim().length > 0 &&
      nameTr.trim().length > 0 &&
      !saving &&
      !loading
    );
  }, [productCode, nameTr, saving, loading]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name ?? "").toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const selectedCategoryChips = useMemo(() => {
    return selectedCategoryIDs.map((id) => {
      const found = categories.find((c) => c.id === id);
      return found ?? { id, name: `#${id} (lookup yok)`, isActive: true };
    });
  }, [selectedCategoryIDs, categories]);

  const warehouseName = (warehouseID: number) =>
    warehouses.find((w) => w.id === warehouseID)?.name ?? `#${warehouseID}`;

  const currencyCode = (currencyID: number) =>
    currencyOptions.find((c) => c.id === currencyID)?.code ?? `#${currencyID}`;

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

  const TabButton = ({
    k,
    label,
    icon,
  }: {
    k: TabKey;
    label: string;
    icon: React.ReactNode;
  }) => {
    const active = tab === k;
    return (
      <button
        type="button"
        onClick={() => setTab(k)}
        className={[
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
          active
            ? "border-[#845ec2]/25 bg-[#fbeaff]/40 text-black"
            : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]",
        ].join(" ")}
      >
        {icon}
        {label}
      </button>
    );
  };

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
            disabled={saving || savingDims || savingAdds || priceSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
          >
            <X className="h-4 w-4" />
            Geri
          </button>

          <button
            onClick={onSaveGeneralAndImages}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
            title="Genel bilgileri kaydeder. Resim seçtiysen onları da yükler."
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

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TabButton
          k="general"
          label="Genel"
          icon={<Save className="h-4 w-4" />}
        />
        <TabButton
          k="images"
          label="Resimler"
          icon={<Upload className="h-4 w-4" />}
        />
        <TabButton
          k="prices"
          label="Fiyatlar"
          icon={<BadgeDollarSign className="h-4 w-4" />}
        />
        <TabButton
          k="dimensions"
          label="Ölçüler"
          icon={<Ruler className="h-4 w-4" />}
        />
        <TabButton
          k="additionals"
          label="Ek Bilgiler"
          icon={<LinkIcon className="h-4 w-4" />}
        />
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* TAB: GENERAL */}
      {tab === "general" && (
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
                    Fiyatlar depo bazlıdır: <b>Fiyatlar</b> sekmesinden
                    yönetilir.
                  </div>
                </div>
              </div>
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
                  <div className="text-sm text-black/50">
                    Seçili kategori yok
                  </div>
                ) : (
                  selectedCategoryChips.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        setSelectedCategoryIDs((s) =>
                          s.filter((x) => x !== c.id)
                        )
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
                            checked
                              ? "font-semibold text-black"
                              : "text-black/70"
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

              <div className="mt-2 text-xs text-black/50">
                Marka tek seçilir.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IMAGES */}
      {tab === "images" && (
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
              {uploadFiles.length} dosya seçildi. Üstteki <b>Kaydet</b> butonu
              ile yüklenir.
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
      )}

      {/* TAB: PRICES */}
      {tab === "prices" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-[--foreground]">
                  Fiyatlar
                </div>
                <div className="text-xs text-black/50"></div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reloadPrices()}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Yenile
                </button>

                <button
                  type="button"
                  onClick={openCreatePrice}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Fiyat
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-auto rounded-2xl border border-black/10">
              <table className="min-w-[780px] w-full text-sm">
                <thead className="bg-black/[0.02]">
                  <tr className="text-left text-black/60">
                    <th className="px-4 py-3 font-semibold">Depo</th>
                    <th className="px-4 py-3 font-semibold">Döviz Tipi</th>
                    <th className="px-4 py-3 font-semibold">Alış Fiyatı</th>
                    <th className="px-4 py-3 font-semibold">Ana Fiyat</th>
                    <th className="px-4 py-3 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {pricesLoading ? (
                    <tr>
                      <td className="px-4 py-4" colSpan={5}>
                        <div className="flex items-center gap-2 text-black/70">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Yükleniyor...
                        </div>
                      </td>
                    </tr>
                  ) : prices.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-black/50" colSpan={5}>
                        Henüz fiyat yok. “Yeni Fiyat” ile ekleyebilirsin.
                      </td>
                    </tr>
                  ) : (
                    prices.map((p) => (
                      <tr key={p.id} className="border-t border-black/10">
                        <td className="px-4 py-3">
                          {warehouseName(p.warehouseID)}
                        </td>
                        <td className="px-4 py-3">
                          {currencyCode(p.currencyID)}
                        </td>
                        <td className="px-4 py-3">{fmtMoney(p.costPrice)}</td>
                        <td className="px-4 py-3 font-semibold">
                          {fmtMoney(p.priceValue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPrice(p)}
                              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePrice(p.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {priceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-[--foreground]">
                      {editingPriceId ? "Fiyat Düzenle" : "Yeni Fiyat"}
                    </div>
                    <div className="text-xs text-black/50"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPriceModalOpen(false);
                      resetPriceForm();
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 hover:bg-black/[0.03]"
                  >
                    <X className="h-4 w-4 text-black/70" />
                  </button>
                </div>

                <div className="p-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Depo
                      </label>
                      <select
                        value={pWarehouseID}
                        onChange={(e) => setPWarehouseID(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      >
                        <option value="">(Seçiniz)</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Para Birimi
                      </label>
                      <select
                        value={pCurrencyID}
                        onChange={(e) => setPCurrencyID(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      >
                        {currencyOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMode((m) => (m === "ratio" ? "manual" : "ratio"))
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/[0.03]"
                        title="Oran modunda fiyat hesaplanır; Fiyat modunda manuel girilir."
                      >
                        {mode === "ratio"
                          ? "Oran Gireceğim"
                          : "Fiyat Gireceğim"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {/* Left: Prices */}
                    <div className="rounded-2xl border border-black/10 p-4">
                      <div className="mb-3 text-sm font-semibold text-black/70">
                        Temel
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Alış Fiyatı
                          </label>
                          <input
                            value={pCostPrice}
                            onChange={(e) => setPCostPrice(e.target.value)}
                            placeholder="örn: 100"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Liste Fiyatı
                          </label>
                          <input
                            value={pListPrice}
                            onChange={(e) => setPListPrice(e.target.value)}
                            placeholder="örn: 150"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Ana Fiyat
                          </label>

                          <input
                            value={
                              mode === "ratio"
                                ? (effectivePriceValue ?? "").toString()
                                : pPriceValue
                            }
                            onChange={(e) => setPPriceValue(e.target.value)}
                            disabled={mode === "ratio"}
                            placeholder={
                              mode === "ratio"
                                ? "Oran modunda otomatik hesaplanır"
                                : "örn: 180"
                            }
                            className={[
                              "w-full rounded-2xl border px-4 py-3 outline-none transition",
                              mode === "ratio"
                                ? "border-black/10 bg-black/[0.03] text-black/60"
                                : "border-black/10 bg-white focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25",
                            ].join(" ")}
                          />

                          {mode === "ratio" && (
                            <div className="mt-2 text-xs text-black/55">
                              Hesap: (Alış + Alış * (Kâr Marjı/100)) + Lojistik
                              + Taşıma
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Diğer Fiyat
                          </label>
                          <input
                            value={pOther1}
                            onChange={(e) => setPOther1(e.target.value)}
                            placeholder="opsiyonel"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Diğer Fiyat 2
                          </label>
                          <input
                            value={pOther2}
                            onChange={(e) => setPOther2(e.target.value)}
                            placeholder="opsiyonel"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Diğer Fiyat 3
                          </label>
                          <input
                            value={pOther3}
                            onChange={(e) => setPOther3(e.target.value)}
                            placeholder="opsiyonel"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            KDV
                          </label>
                          <input
                            value={pTaxRatio}
                            onChange={(e) => setPTaxRatio(e.target.value)}
                            placeholder="örn: 20"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-8">
                          <input
                            type="checkbox"
                            checked={pInTax}
                            onChange={(e) => setPInTax(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-black/70">
                            KDV Dahil
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Ratios + Costs */}
                    <div className="rounded-2xl border border-black/10 p-4">
                      <div className="mb-3 text-sm font-semibold text-black/70">
                        Oran / Maliyetler
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Kâr Marjı (%)
                          </label>
                          <input
                            value={pProfitRatio}
                            onChange={(e) => setPProfitRatio(e.target.value)}
                            placeholder="örn: 25"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Lojistik
                          </label>
                          <input
                            value={pLogisticCost}
                            onChange={(e) => setPLogisticCost(e.target.value)}
                            placeholder="opsiyonel"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Taşıma
                          </label>
                          <input
                            value={pPorterageCost}
                            onChange={(e) => setPPorterageCost(e.target.value)}
                            placeholder="opsiyonel"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Nakit
                          </label>
                          <input
                            value={pCashRatio}
                            onChange={(e) => setPCashRatio(e.target.value)}
                            placeholder="örn: 1.00"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                          <div className="mt-1 text-xs text-black/50">
                            Nakit: {fmtMoney(derivedCash)}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Tek Çekim
                          </label>
                          <input
                            value={pCcSingleRatio}
                            onChange={(e) => setPCcSingleRatio(e.target.value)}
                            placeholder="örn: 1.05"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                          <div className="mt-1 text-xs text-black/50">
                            Tek çekim: {fmtMoney(derivedSingle)}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Taksit
                          </label>
                          <input
                            value={pCcInstallmentRatio}
                            onChange={(e) =>
                              setPCcInstallmentRatio(e.target.value)
                            }
                            placeholder="örn: 1.12"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                          <div className="mt-1 text-xs text-black/50">
                            Taksitli: {fmtMoney(derivedInstallment)}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-black/70">
                            Vadeli
                          </label>
                          <input
                            value={pDeferredRatio}
                            onChange={(e) => setPDeferredRatio(e.target.value)}
                            placeholder="örn: 1.20"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                          />
                          <div className="mt-1 text-xs text-black/50">
                            Vadeli: {fmtMoney(derivedDeferred)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-sm">
                        <div className="text-black/70">
                          <span className="font-semibold">Ana Fiyat:</span>{" "}
                          {fmtMoney(effectivePriceValue)}{" "}
                          {currencyCode(Number(pCurrencyID))}
                        </div>
                        <div className="mt-1 text-xs text-black/55"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/10 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPriceModalOpen(false);
                      resetPriceForm();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
                    disabled={priceSaving}
                  >
                    <X className="h-4 w-4" />
                    Kapat
                  </button>

                  <button
                    type="button"
                    onClick={savePrice}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
                    disabled={priceSaving}
                  >
                    {priceSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: DIMENSIONS */}
      {tab === "dimensions" && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[--foreground]">
                Ürün Ölçüleri
              </div>
              <div className="text-xs text-black/50">
                Zorunlu değil. Boş bırakılabilir.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearDimensions}
                disabled={savingDims}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                title="DB'deki ölçü kaydını siler."
              >
                <Trash2 className="h-4 w-4" />
                Temizle
              </button>

              <button
                onClick={onSaveDimensions}
                disabled={savingDims}
                className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
              >
                {savingDims ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Uzunluk
              </label>
              <input
                value={dimLength}
                onChange={(e) => setDimLength(e.target.value)}
                placeholder="örn: 10.5"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Genişlik
              </label>
              <input
                value={dimWidth}
                onChange={(e) => setDimWidth(e.target.value)}
                placeholder="örn: 20"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Yükseklik
              </label>
              <input
                value={dimHeight}
                onChange={(e) => setDimHeight(e.target.value)}
                placeholder="örn: 30"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Ağırlık
              </label>
              <input
                value={dimWeight}
                onChange={(e) => setDimWeight(e.target.value)}
                placeholder="örn: 1.2"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Desi
              </label>
              <input
                value={dimDesi}
                onChange={(e) => setDimDesi(e.target.value)}
                placeholder="örn: 3"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <button
              type="button"
              onClick={() => reloadDims()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/70 hover:bg-black/[0.03]"
              title="DB'den tekrar oku"
            >
              <RotateCcw className="h-4 w-4" />
              Yenile
            </button>
          </div>
        </div>
      )}

      {/* TAB: ADDITIONALS */}
      {tab === "additionals" && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[--foreground]">
                Ek Bilgiler
              </div>
              <div className="text-xs text-black/50">
                Zorunlu değil. Boş bırakılabilir.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearAdditionals}
                disabled={savingAdds}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                title="DB'deki ek bilgi kaydını siler."
              >
                <Trash2 className="h-4 w-4" />
                Temizle
              </button>

              <button
                onClick={onSaveAdditionals}
                disabled={savingAdds}
                className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
              >
                {savingAdds ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Diğer Link 1
              </label>
              <input
                value={otherLink1}
                onChange={(e) => setOtherLink1(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Diğer Link 2
              </label>
              <input
                value={otherLink2}
                onChange={(e) => setOtherLink2(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-black/70">
                Diğer Link 3
              </label>
              <input
                value={otherLink3}
                onChange={(e) => setOtherLink3(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Menşei
              </label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="örn: Türkiye"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black/70">
                Servis Telefon Numarası
              </label>
              <input
                value={servicePhoneNumber}
                onChange={(e) => setServicePhoneNumber(e.target.value)}
                placeholder="+90..."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Garanti
                </label>
                <input
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="örn: 24 Ay"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <button
                type="button"
                onClick={() => reloadAdds()}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/70 hover:bg-black/[0.03]"
                title="DB'den tekrar oku"
              >
                <RotateCcw className="h-4 w-4" />
                Yenile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
