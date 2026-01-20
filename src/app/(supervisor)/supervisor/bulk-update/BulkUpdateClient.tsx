"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  // Save,
  // Loader2,
  X,
  SlidersHorizontal,
  RefreshCcw,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";

type LookupItem = { id: number; name: string; isActive: boolean };

type BulkRow = {
  priceId: number;

  productId: number;
  productCode: string;
  productName: string;
  productIsActive: boolean;
  primaryImageUrl: string | null;

  warehouseId: number;
  warehouseName: string;

  currencyId: number;
  currencyCode: string;

  taxRatio: number | null;

  costPrice: number | null;
  profitRatio: number | null; // yüzde
  logisticCost: number | null;
  porterageCost: number | null;

  price: number | null;
  ccSinglePrice: number | null;
  ccInstallmentPrice: number | null;

  otherPrice1: number | null;

  dealerCashMarginPct: number | null;
  dealerCcSingleMarginPct: number | null;
  dealerCcInstallmentMarginPct: number | null;
};

type BulkGridResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  ccSingleRatioValue: number;
  ccInstallmentRatioValue: number;

  items: BulkRow[];
};

type PatchItem = {
  priceId: number;
  costPrice?: number | null;
  profitRatio?: number | null;
  logisticCost?: number | null;
  porterageCost?: number | null;
  otherPrice1?: number | null;
};

function n(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}
function nn(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function normalizeBulkRow(x: any): BulkRow {
  const priceId = n(
    x?.priceId ?? x?.priceID ?? x?.PriceID ?? x?.id ?? x?.ID,
    0,
  );
  const productId = n(x?.productId ?? x?.productID ?? x?.ProductID, 0);
  const warehouseId = n(x?.warehouseId ?? x?.warehouseID ?? x?.WarehouseID, 0);
  const currencyId = n(x?.currencyId ?? x?.currencyID ?? x?.CurrencyID, 0);

  return {
    priceId,

    productId,
    productCode: String(x?.productCode ?? x?.ProductCode ?? ""),
    productName: String(x?.productName ?? x?.ProductName ?? "-"),
    productIsActive: Boolean(
      x?.productIsActive ?? x?.ProductIsActive ?? x?.isActive ?? x?.IsActive,
    ),
    primaryImageUrl: x?.primaryImageUrl ?? x?.PrimaryImageUrl ?? null,

    warehouseId,
    warehouseName: String(x?.warehouseName ?? x?.WarehouseName ?? "-"),

    currencyId,
    currencyCode: String(x?.currencyCode ?? x?.CurrencyCode ?? "-"),

    taxRatio: nn(x?.taxRatio ?? x?.TaxRatio),

    costPrice: nn(x?.costPrice ?? x?.CostPrice),
    profitRatio: nn(x?.profitRatio ?? x?.ProfitRatio),
    logisticCost: nn(x?.logisticCost ?? x?.LogisticCost),
    porterageCost: nn(x?.porterageCost ?? x?.PorterageCost),

    price: nn(x?.price ?? x?.Price),
    ccSinglePrice: nn(x?.ccSinglePrice ?? x?.CcSinglePrice),
    ccInstallmentPrice: nn(x?.ccInstallmentPrice ?? x?.CcInstallmentPrice),

    otherPrice1: nn(x?.otherPrice1 ?? x?.OtherPrice1),

    dealerCashMarginPct: nn(x?.dealerCashMarginPct ?? x?.DealerCashMarginPct),
    dealerCcSingleMarginPct: nn(
      x?.dealerCcSingleMarginPct ?? x?.DealerCcSingleMarginPct,
    ),
    dealerCcInstallmentMarginPct: nn(
      x?.dealerCcInstallmentMarginPct ?? x?.DealerCcInstallmentMarginPct,
    ),
  };
}

function normalizeGridResponse(res: any): BulkGridResponse {
  const page = n(res?.page ?? res?.Page, 1);
  const pageSize = n(res?.pageSize ?? res?.PageSize, 30);
  const total = n(res?.total ?? res?.Total, 0);
  const totalPages = n(res?.totalPages ?? res?.TotalPages, 1);

  const ccSingleRatioValue = Number(
    res?.ccSingleRatioValue ?? res?.CcSingleRatioValue ?? 1,
  );
  const ccInstallmentRatioValue = Number(
    res?.ccInstallmentRatioValue ?? res?.CcInstallmentRatioValue ?? 1,
  );

  const itemsRaw = (res?.items ?? res?.Items ?? []) as any[];
  const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(normalizeBulkRow);

  return {
    page,
    pageSize,
    total,
    totalPages,
    ccSingleRatioValue: Number.isFinite(ccSingleRatioValue)
      ? ccSingleRatioValue
      : 1,
    ccInstallmentRatioValue: Number.isFinite(ccInstallmentRatioValue)
      ? ccInstallmentRatioValue
      : 1,
    items,
  };
}

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

async function apiPatch<T>(url: string, body: any): Promise<T> {
  let r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (r.status === 401) {
    const rr = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
    });
    if (rr.ok) {
      r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    }
  }

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "Güncelleme başarısız.");
  return data as T;
}

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v) + "%"
  );
}

function numOrNull(s: string) {
  const t = (s ?? "").trim();
  if (!t) return null;
  const normalized = t.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}

function calcPriceLocal(
  row: Pick<
    BulkRow,
    "costPrice" | "profitRatio" | "logisticCost" | "porterageCost"
  >,
) {
  const cost = row.costPrice ?? null;
  if (cost === null) return null;

  const profit = row.profitRatio ?? 0;
  const logistic = row.logisticCost ?? 0;
  const porterage = row.porterageCost ?? 0;

  return ((100 + profit) * cost) / 100 + logistic + porterage;
}

function safeMarginPct(otherPrice1: number | null, base: number | null) {
  if (otherPrice1 === null || base === null || base === 0) return null;
  return (otherPrice1 / base - 1) * 100;
}

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

/** Modern popover multi-select (arama + checkbox + chip) */
function FilterMultiSelect({
  title,
  icon,
  items,
  values,
  setValues,
}: {
  title: string;
  icon?: React.ReactNode;
  items: LookupItem[];
  values: number[];
  setValues: (v: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (!ref.current) return;
      const t = e.target as Node;
      if (!ref.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activeItems = useMemo(
    () => (items ?? []).filter((x) => x.isActive),
    [items],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return activeItems;
    return activeItems.filter((x) => x.name.toLowerCase().includes(s));
  }, [q, activeItems]);

  const selectedMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const it of activeItems) m.set(it.id, it.name);
    return m;
  }, [activeItems]);

  const selectedNames = values
    .map((id) => ({ id, name: selectedMap.get(id) ?? `#${id}` }))
    .slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-sm transition",
          "border-black/10 bg-white hover:bg-black/[0.03]",
          open && "ring-4 ring-black/10 border-black/20",
        )}
      >
        <span className="text-black/70">{icon}</span>
        <span className="text-black/85">{title}</span>
        {values.length > 0 && (
          <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold text-black/70">
            {values.length}
          </span>
        )}
      </button>

      {/* chips */}
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedNames.map((x) => (
            <span
              key={x.id}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-black/70"
            >
              {x.name}
              <button
                type="button"
                onClick={() => setValues(values.filter((v) => v !== x.id))}
                className="rounded-full p-0.5 hover:bg-black/5"
                title="Kaldır"
              >
                <X className="h-3 w-3 text-black/70" />
              </button>
            </span>
          ))}
          {values.length > 6 && (
            <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-semibold text-black/60">
              +{values.length - 6}
            </span>
          )}
          <button
            type="button"
            onClick={() => setValues([])}
            className="ml-1 text-xs font-semibold text-black/50 hover:text-black/70"
          >
            Temizle
          </button>
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`${title} ara...`}
                  className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-black/10 bg-white p-2 hover:bg-black/[0.03]"
                title="Kapat"
              >
                <X className="h-4 w-4 text-black/70" />
              </button>
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-black/10">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-black/45">
                  Sonuç yok
                </div>
              ) : (
                filtered.map((it) => {
                  const checked = values.includes(it.id);
                  return (
                    <button
                      type="button"
                      key={it.id}
                      onClick={() => {
                        if (checked)
                          setValues(values.filter((x) => x !== it.id));
                        else setValues([...values, it.id]);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                        "hover:bg-black/[0.03] border-b border-black/5 last:border-b-0",
                      )}
                    >
                      <span className="text-black/80">{it.name}</span>

                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-lg border",
                          checked
                            ? "bg-black text-white border-black"
                            : "bg-white text-transparent border-black/10",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setValues([])}
                className="text-xs font-semibold text-black/50 hover:text-black/70"
              >
                Seçimi temizle
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Basit fullscreen modal */
function FullscreenModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 p-3 sm:p-6">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black/[0.04]">
                <Maximize2 className="h-5 w-5 text-black/70" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black/85">
                  {title}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/80 hover:bg-black/[0.03]"
            >
              <Minimize2 className="h-4 w-4 text-black/70" />
              Kapat
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function BulkUpdateClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(q);
  const [onlyActive, setOnlyActive] = useState(true);

  const [brandIDs, setBrandIDs] = useState<number[]>([]);
  const [categoryIDs, setCategoryIDs] = useState<number[]>([]);
  const [warehouseIDs, setWarehouseIDs] = useState<number[]>([]);

  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // grid response ratios
  const [ccSingleRatioValue, setCcSingleRatioValue] = useState(1);
  const [ccInstallmentRatioValue, setCcInstallmentRatioValue] = useState(1);

  const [items, setItems] = useState<BulkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // lookups
  const [brandLookup, setBrandLookup] = useState<LookupItem[]>([]);
  const [categoryLookup, setCategoryLookup] = useState<LookupItem[]>([]);
  const [warehouseLookup, setWarehouseLookup] = useState<LookupItem[]>([]);

  // inline edit buffer
  const editsRef = useRef<Map<number, PatchItem>>(new Map());

  // autosave timers per priceId
  const autosaveTimersRef = useRef<Map<number, any>>(new Map());

  // saving state per row (allow multiple)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // ✅ GÜNCELLEME: Success ve Error durumları için state
  const [successIds, setSuccessIds] = useState<Set<number>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<number>>(new Set());

  // image preview
  const [preview, setPreview] = useState<{
    src: string;
    alt: string;
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  // fullscreen
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  function getPreviewPos(rect: DOMRect) {
    const gap = 12;
    const w = 360;
    const h = 360;

    let left = rect.right + gap;
    let top = rect.top - 6;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + w > vw - 8) left = rect.left - gap - w;
    if (top + h > vh - 8) top = vh - 8 - h;
    if (top < 8) top = 8;

    return { left: Math.round(left), top: Math.round(top), w, h };
  }

  async function loadLookups() {
    try {
      const [brs, cats, whs] = await Promise.all([
        apiGet<any>(`/api/supervisor/brands?lang=tr&page=1&pageSize=500&q=`),
        apiGet<any>(
          `/api/supervisor/categories?lang=tr&page=1&pageSize=500&q=`,
        ),
        apiGet<any>(
          `/api/supervisor/warehouses?lang=tr&page=1&pageSize=500&q=`,
        ),
      ]);

      const bItems = (brs?.items ?? brs) as LookupItem[];
      const cItems = (cats?.items ?? cats) as LookupItem[];
      const wItems = (whs?.items ?? whs) as LookupItem[];

      setBrandLookup(Array.isArray(bItems) ? bItems : []);
      setCategoryLookup(Array.isArray(cItems) ? cItems : []);
      setWarehouseLookup(Array.isArray(wItems) ? wItems : []);
    } catch {
      // sessiz
    }
  }

  function buildQuery(p: number, ps: number) {
    const params = new URLSearchParams();
    params.set("lang", "tr");
    params.set("page", String(p));
    params.set("pageSize", String(ps));
    params.set("q", qDebounced.trim());

    if (onlyActive) params.set("isActive", "true");

    for (const id of brandIDs) params.append("brandIds", String(id));
    for (const id of categoryIDs) params.append("categoryIds", String(id));
    for (const id of warehouseIDs) params.append("warehouseIds", String(id));

    return params.toString();
  }

  async function load(next?: { page?: number; pageSize?: number }) {
    const p = next?.page ?? page;
    const ps = next?.pageSize ?? pageSize;

    setLoading(true);
    setErr(null);

    try {
      const qs = buildQuery(p, ps);
      const dataRaw = await apiGet<any>(`/api/supervisor/bulk?${qs}`);
      const data = normalizeGridResponse(dataRaw);

      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? p);
      setPageSize(data.pageSize ?? ps);

      setCcSingleRatioValue(data.ccSingleRatioValue ?? 1);
      setCcInstallmentRatioValue(data.ccInstallmentRatioValue ?? 1);

      editsRef.current.clear();
    } catch (e: any) {
      setErr(e?.message ?? "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLookups();
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    qDebounced,
    onlyActive,
    brandIDs.join(","),
    categoryIDs.join(","),
    warehouseIDs.join(","),
  ]);

  const hasAny = useMemo(() => items.length > 0, [items]);

  function clearEdits(priceId: number) {
    editsRef.current.delete(priceId);
  }

  async function savePriceId(priceId: number) {
    const patch = editsRef.current.get(priceId);
    if (!patch) return;

    setErr(null);

    // 1. Saving'e ekle, diğer statüleri temizle
    setSavingIds((prev) => {
      const n = new Set(prev);
      n.add(priceId);
      return n;
    });
    setSuccessIds((prev) => {
      const n = new Set(prev);
      n.delete(priceId);
      return n;
    });
    setErrorIds((prev) => {
      const n = new Set(prev);
      n.delete(priceId);
      return n;
    });

    try {
      await apiPatch(`/api/supervisor/bulk`, [patch]);
      clearEdits(priceId);

      // 2. Başarılı olduysa Success'e ekle (ve 2sn sonra sil)
      setSuccessIds((prev) => {
        const n = new Set(prev);
        n.add(priceId);
        return n;
      });
      setTimeout(() => {
        setSuccessIds((prev) => {
          const n = new Set(prev);
          n.delete(priceId);
          return n;
        });
      }, 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
      // 3. Hata olduysa Error'a ekle
      setErrorIds((prev) => {
        const n = new Set(prev);
        n.add(priceId);
        return n;
      });
    } finally {
      // 4. Saving'den çıkar
      setSavingIds((prev) => {
        const n = new Set(prev);
        n.delete(priceId);
        return n;
      });
    }
  }

  function scheduleAutosave(priceId: number) {
    const old = autosaveTimersRef.current.get(priceId);
    if (old) clearTimeout(old);

    const t = setTimeout(() => {
      void savePriceId(priceId);
    }, 2000);

    autosaveTimersRef.current.set(priceId, t);
  }

  function setEdit(priceId: number, patch: Omit<PatchItem, "priceId">) {
    const m = editsRef.current;
    const cur = m.get(priceId) ?? { priceId };
    m.set(priceId, { ...cur, priceId, ...patch });

    // ✅ Eğer kullanıcı tekrar düzenliyorsa eski success/error durumunu sil
    setSuccessIds((prev) => {
      if (!prev.has(priceId)) return prev;
      const n = new Set(prev);
      n.delete(priceId);
      return n;
    });
    setErrorIds((prev) => {
      if (!prev.has(priceId)) return prev;
      const n = new Set(prev);
      n.delete(priceId);
      return n;
    });

    setItems((prev) =>
      prev.map((x) => {
        if (x.priceId !== priceId) return x;

        const nextRow = { ...x, ...patch } as BulkRow;

        const newPrice = calcPriceLocal(nextRow);
        nextRow.price = newPrice;

        nextRow.ccSinglePrice =
          newPrice == null ? null : newPrice * (ccSingleRatioValue ?? 1);

        nextRow.ccInstallmentPrice =
          newPrice == null ? null : newPrice * (ccInstallmentRatioValue ?? 1);

        nextRow.dealerCashMarginPct = safeMarginPct(
          nextRow.otherPrice1,
          nextRow.price,
        );
        nextRow.dealerCcSingleMarginPct = safeMarginPct(
          nextRow.otherPrice1,
          nextRow.ccSinglePrice,
        );
        nextRow.dealerCcInstallmentMarginPct = safeMarginPct(
          nextRow.otherPrice1,
          nextRow.ccInstallmentPrice,
        );

        return nextRow;
      }),
    );

    scheduleAutosave(priceId);
  }

  // ✅ Fix-2: İç component re-mount -> scroll başa atma.
  // Artık Filters/Table/Paging render fonksiyonları useCallback ile stabil.
  const renderFiltersBar = useCallback(
    (opts?: { inModal?: boolean }) => {
      const inModal = Boolean(opts?.inModal);

      return (
        <div
          className={cn(
            "rounded-3xl border border-black/10 bg-white p-4 shadow-sm",
            inModal ? "mb-4" : "mb-5",
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-[280px] flex-1">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Ürün ara (ad / kod / barkod)"
                      className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/10"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyActive((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition",
                    onlyActive
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                      : "border-black/10 bg-white text-black/80 hover:bg-black/[0.03]",
                  )}
                  title="Sadece aktif ürünler"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-lg bg-white/70">
                    <SlidersHorizontal className="h-4 w-4 text-black/70" />
                  </span>
                  Aktif
                  <span className="text-xs font-bold opacity-80">
                    {onlyActive ? "Açık" : "Kapalı"}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterMultiSelect
                    title="Marka"
                    icon={<span className="text-[12px] font-black">M</span>}
                    items={brandLookup}
                    values={brandIDs}
                    setValues={setBrandIDs}
                  />
                  <FilterMultiSelect
                    title="Kategori"
                    icon={<span className="text-[12px] font-black">K</span>}
                    items={categoryLookup}
                    values={categoryIDs}
                    setValues={setCategoryIDs}
                  />
                  <FilterMultiSelect
                    title="Depo"
                    icon={<span className="text-[12px] font-black">D</span>}
                    items={warehouseLookup}
                    values={warehouseIDs}
                    setValues={setWarehouseIDs}
                  />
                </div>
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
                  className="rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-black/80"
                >
                  {[20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/sayfa
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => void load({ page: 1 })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-black/80 hover:bg-black/[0.03]"
                >
                  <RefreshCcw className="h-4 w-4 text-black/70" />
                  Yenile
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/[0.02] px-3 py-2">
              <div className="text-sm text-black/60">
                Toplam <span className="font-semibold text-black">{total}</span>{" "}
                kayıt • Sayfa{" "}
                <span className="font-semibold text-black">{page}</span> /{" "}
                {totalPages}
                <span className="ml-3 text-xs text-black/45">
                  Tek Çekim: {ccSingleRatioValue} • Taksit:{" "}
                  {ccInstallmentRatioValue}
                </span>
              </div>

              {!inModal && (
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm"
                  title="Tabloyu tam ekranda aç"
                >
                  <Maximize2 className="h-4 w-4 text-white" />
                  Tam ekran
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      q,
      onlyActive,
      brandLookup,
      categoryLookup,
      warehouseLookup,
      brandIDs,
      categoryIDs,
      warehouseIDs,
      pageSize,
      total,
      page,
      totalPages,
      ccSingleRatioValue,
      ccInstallmentRatioValue,
      load,
    ],
  );

  const renderPagingBar = useCallback(() => {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-black/60">
          Toplam <span className="font-semibold text-black">{total}</span> kayıt
          • Sayfa <span className="font-semibold text-black">{page}</span> /{" "}
          {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => void load({ page: page - 1 })}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/80 disabled:opacity-50"
          >
            Önceki
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => void load({ page: page + 1 })}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/80 disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>
    );
  }, [total, page, totalPages, loading, load]);

  const renderTableView = useCallback(
    (compact?: boolean) => {
      // Sticky column widths (fixed)
      const W_PRODUCT = 360;
      const W_CODE = 140;
      const W_DEPOT = 180;

      // Headerlar
      const thProductClass =
        "sticky left-0 z-[60] bg-white/95 backdrop-blur border-b border-black/10 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)]";
      const thCodeClass =
        "sticky z-[59] bg-white/95 backdrop-blur border-b border-black/10 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)]";
      const thDepotClass =
        "sticky z-[58] bg-white/95 backdrop-blur border-b border-black/10 shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)]";

      return (
        <div className={cn(compact ? "p-3" : "")}>
          <div
            className={cn(
              !compact &&
                "overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm",
            )}
          >
            <div className="overflow-auto">
              <table
                className={cn(
                  "w-full text-sm",
                  compact ? "min-w-[1850px]" : "min-w-[1750px]",
                )}
              >
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-black/10">
                  <tr className="text-left text-black/60">
                    <th
                      className={cn(thProductClass, "px-4 py-3")}
                      style={{ width: W_PRODUCT, minWidth: W_PRODUCT }}
                    >
                      Ürün
                    </th>
                    <th
                      className={cn(thCodeClass, "px-4 py-3")}
                      style={{
                        left: W_PRODUCT,
                        width: W_CODE,
                        minWidth: W_CODE,
                      }}
                    >
                      Kod
                    </th>
                    <th
                      className={cn(thDepotClass, "px-4 py-3")}
                      style={{
                        left: W_PRODUCT + W_CODE,
                        width: W_DEPOT,
                        minWidth: W_DEPOT,
                      }}
                    >
                      Depo
                    </th>

                    <th className="px-4 py-3">Para Birimi</th>
                    <th className="px-4 py-3 text-right">KDV</th>

                    <th className="px-4 py-3 text-right">Maliyet</th>
                    <th className="px-4 py-3 text-right">Kâr</th>
                    <th className="px-4 py-3 text-right">Lojistik</th>
                    <th className="px-4 py-3 text-right">Hammaliye</th>

                    <th className="px-4 py-3 text-right">Nakit</th>
                    <th className="px-4 py-3 text-right">Tek Çekim</th>
                    <th className="px-4 py-3 text-right">Taksit</th>

                    <th className="px-4 py-3 text-right">Akakçe</th>

                    <th className="px-4 py-3 text-right">Bayi Nakit%</th>
                    <th className="px-4 py-3 text-right">Bayi Tek%</th>
                    <th className="px-4 py-3 text-right">Bayi Taksit%</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={16}
                        className="px-4 py-12 text-center text-black/45"
                      >
                        Yükleniyor...
                      </td>
                    </tr>
                  )}

                  {!loading && !hasAny && (
                    <tr>
                      <td
                        colSpan={16}
                        className="px-4 py-12 text-center text-black/45"
                      >
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    items.map((row) => {
                      const price = row.price ?? calcPriceLocal(row);
                      const ccSingle =
                        row.ccSinglePrice ??
                        (price == null
                          ? null
                          : price * (ccSingleRatioValue ?? 1));
                      const ccInst =
                        row.ccInstallmentPrice ??
                        (price == null
                          ? null
                          : price * (ccInstallmentRatioValue ?? 1));

                      const bayiNakit =
                        row.dealerCashMarginPct ??
                        safeMarginPct(row.otherPrice1, price);
                      const bayiTek =
                        row.dealerCcSingleMarginPct ??
                        safeMarginPct(row.otherPrice1, ccSingle);
                      const bayiTaksit =
                        row.dealerCcInstallmentMarginPct ??
                        safeMarginPct(row.otherPrice1, ccInst);

                      // ✅ Durumları kontrol et
                      const isSuccess = successIds.has(row.priceId);
                      const isError = errorIds.has(row.priceId);

                      // ✅ Satır Rengi (TR)
                      let trClass =
                        "group border-t border-black/5 transition-colors duration-300";
                      if (isError) {
                        trClass += " bg-red-100 hover:bg-red-200";
                      } else if (isSuccess) {
                        trClass += " bg-emerald-100 hover:bg-emerald-200";
                      } else {
                        trClass += " hover:bg-black/[0.02]";
                      }

                      // ✅ Sticky hücreler için arka plan (normal ve hover)
                      // Sticky hücreler normalde bg-white olduğu için, satır rengini ezerler.
                      // Bu yüzden onların da bg rengini duruma göre değiştirmemiz lazım.
                      let stickyBgClass = "";
                      if (isError) {
                        stickyBgClass = "bg-red-100 group-hover:bg-red-200";
                      } else if (isSuccess) {
                        stickyBgClass =
                          "bg-emerald-100 group-hover:bg-emerald-200";
                      } else {
                        stickyBgClass = "bg-white group-hover:bg-[#fafafa]";
                      }

                      const tdProductClass = `sticky left-0 z-[30] ${stickyBgClass} shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)] transition-colors duration-300`;
                      const tdCodeClass = `sticky z-[29] ${stickyBgClass} shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)] transition-colors duration-300`;
                      const tdDepotClass = `sticky z-[28] ${stickyBgClass} shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)] transition-colors duration-300`;

                      return (
                        <tr key={`price-${row.priceId}`} className={trClass}>
                          {/* ✅ Sticky: Ürün */}
                          <td
                            className={cn(tdProductClass, "px-4 py-3")}
                            style={{ width: W_PRODUCT, minWidth: W_PRODUCT }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="relative h-11 w-11 overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]"
                                onMouseEnter={(e) => {
                                  if (!row.primaryImageUrl) return;
                                  const rect = (
                                    e.currentTarget as HTMLDivElement
                                  ).getBoundingClientRect();
                                  const pos = getPreviewPos(rect);
                                  setPreview({
                                    src: row.primaryImageUrl,
                                    alt: row.productName,
                                    ...pos,
                                  });
                                }}
                                onMouseLeave={() => setPreview(null)}
                              >
                                {row.primaryImageUrl ? (
                                  <Image
                                    src={row.primaryImageUrl}
                                    alt={row.productName}
                                    fill
                                    className="object-cover"
                                    sizes="44px"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-xs text-black/40">
                                    —
                                  </div>
                                )}
                              </div>

                              <div className="min-w-[260px] leading-tight">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-black line-clamp-2">
                                    {row.productName}
                                  </div>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                                      row.productIsActive
                                        ? "bg-emerald-500/10 text-emerald-700"
                                        : "bg-rose-500/10 text-rose-700",
                                    )}
                                  >
                                    {row.productIsActive ? "Aktif" : "Pasif"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* ✅ Sticky: Kod */}
                          <td
                            className={cn(
                              tdCodeClass,
                              "px-4 py-3 font-semibold",
                            )}
                            style={{
                              left: W_PRODUCT,
                              width: W_CODE,
                              minWidth: W_CODE,
                            }}
                          >
                            <span className="text-black/80">
                              {row.productCode}
                            </span>
                          </td>

                          {/* ✅ Sticky: Depo */}
                          <td
                            className={cn(tdDepotClass, "px-4 py-3")}
                            style={{
                              left: W_PRODUCT + W_CODE,
                              width: W_DEPOT,
                              minWidth: W_DEPOT,
                            }}
                          >
                            <span className="text-black/75">
                              {row.warehouseName}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-black/75">
                            {row.currencyCode}
                          </td>

                          <td className="px-4 py-3 text-right text-black/70">
                            {formatPct(row.taxRatio ?? null)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <input
                              value={row.costPrice ?? ""}
                              onChange={(e) =>
                                setEdit(row.priceId, {
                                  costPrice: numOrNull(e.target.value),
                                })
                              }
                              className="w-28 rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <input
                              value={row.profitRatio ?? ""}
                              onChange={(e) =>
                                setEdit(row.priceId, {
                                  profitRatio: numOrNull(e.target.value),
                                })
                              }
                              className="w-24 rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <input
                              value={row.logisticCost ?? ""}
                              onChange={(e) =>
                                setEdit(row.priceId, {
                                  logisticCost: numOrNull(e.target.value),
                                })
                              }
                              className="w-28 rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <input
                              value={row.porterageCost ?? ""}
                              onChange={(e) =>
                                setEdit(row.priceId, {
                                  porterageCost: numOrNull(e.target.value),
                                })
                              }
                              className="w-28 rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                            />
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-black">
                            {price === null
                              ? "-"
                              : `${formatMoney(price)} ${row.currencyCode}`}
                          </td>

                          <td className="px-4 py-3 text-right text-black/75">
                            {ccSingle === null
                              ? "-"
                              : `${formatMoney(ccSingle)} ${row.currencyCode}`}
                          </td>

                          <td className="px-4 py-3 text-right text-black/75">
                            {ccInst === null
                              ? "-"
                              : `${formatMoney(ccInst)} ${row.currencyCode}`}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <input
                              value={row.otherPrice1 ?? ""}
                              onChange={(e) =>
                                setEdit(row.priceId, {
                                  otherPrice1: numOrNull(e.target.value),
                                })
                              }
                              className="w-32 rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm outline-none focus:border-black/20 focus:ring-4 focus:ring-black/10"
                            />
                          </td>

                          <td className="px-4 py-3 text-right text-black/60">
                            {formatPct(bayiNakit)}
                          </td>
                          <td className="px-4 py-3 text-right text-black/60">
                            {formatPct(bayiTek)}
                          </td>
                          <td className="px-4 py-3 text-right text-black/60">
                            {formatPct(bayiTaksit)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    },
    [
      loading,
      hasAny,
      items,
      ccSingleRatioValue,
      ccInstallmentRatioValue,
      successIds, // ✅ Bağımlılık eklendi
      errorIds, // ✅ Bağımlılık eklendi
      setEdit,
      getPreviewPos,
    ],
  );

  return (
    <div
      onMouseLeave={() => setPreview(null)}
      onScrollCapture={() => setPreview(null)}
    >
      {preview && (
        <div
          className="pointer-events-none fixed z-[9999] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl"
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
              sizes="360px"
              priority
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-black">Toplu Güncelleme</h1>
      </div>

      {renderFiltersBar({ inModal: false })}

      {err && (
        <div className="mb-4 rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {renderTableView(false)}

      {renderPagingBar()}

      <FullscreenModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        title="Tam Ekran"
      >
        <div className="p-4">
          {renderFiltersBar({ inModal: true })}
          {renderTableView(true)}
          {renderPagingBar()}
        </div>
      </FullscreenModal>
    </div>
  );
}
