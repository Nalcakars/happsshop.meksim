"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Trash2,
  X,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";

type LookupItem = { id: number; name: string; isActive: boolean };

type DealerAddressDto = {
  id: number;
  addressTypeID?: number | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district?: string | null;
  country: string;
  postalCode?: string | null;
  isDefault: boolean;
};

type DealerDetailDto = {
  id: number;
  dealerCode: string;
  dealerName: string;
  taxOffice?: string | null;
  taxNumber?: string | null;
  commissionRate: number;
  phoneNumber?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  brandIds: number[];
  addresses: DealerAddressDto[];
};

type TaxCheckResponse = { available: boolean; message?: string };

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

function clampPercent(v: number) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

export default function PartnerEditClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idStr = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // lookups
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);

  // form
  const [dealerCode, setDealerCode] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  // tax
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxChecking, setTaxChecking] = useState(false);
  const [taxAvailable, setTaxAvailable] = useState<boolean | null>(null);
  const [taxMsg, setTaxMsg] = useState<string>("");

  // address (tek adres)
  const [addressId, setAddressId] = useState<number | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [postalCode, setPostalCode] = useState("");

  const [brandIds, setBrandIds] = useState<number[]>([]);

  useEffect(() => {
    if (!idStr) return;

    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);

      try {
        const [detail, brRes] = await Promise.all([
          apiJson<any>(`/api/supervisor/dealers/${idStr}`),
          apiJson<any>(`/api/supervisor/brands?lang=tr&page=1&pageSize=500&q=`),
        ]);

        const d: DealerDetailDto = {
          id: detail?.id ?? detail?.ID,
          dealerCode: detail?.dealerCode ?? detail?.DealerCode ?? "",
          dealerName: detail?.dealerName ?? detail?.DealerName ?? "",
          commissionRate: detail?.commissionRate ?? detail?.CommissionRate ?? 0,
          phoneNumber: detail?.phoneNumber ?? detail?.PhoneNumber ?? null,
          email: detail?.email ?? detail?.Email ?? null,
          isActive: detail?.isActive ?? detail?.IsActive ?? true,
          createdAt: detail?.createdAt ?? detail?.CreatedAt ?? "",
          brandIds: detail?.brandIds ?? detail?.BrandIds ?? [],
          addresses: detail?.addresses ?? detail?.Addresses ?? [],
          taxOffice: detail?.taxOffice ?? detail?.TaxOffice ?? null,
          taxNumber: detail?.taxNumber ?? detail?.TaxNumber ?? null,
        };

        const brs = (brRes.items ?? brRes) as LookupItem[];
        setBrands((brs ?? []).filter((x) => x.isActive));

        setDealerCode(d.dealerCode);
        setDealerName(d.dealerName);
        setCommissionRate(d.commissionRate ?? 0);
        setPhoneNumber(d.phoneNumber ?? "");
        setEmail(d.email ?? "");
        setIsActive(!!d.isActive);
        setBrandIds((d.brandIds ?? []).filter((x: any) => Number(x) > 0));

        setTaxOffice(d.taxOffice ?? "");
        setTaxNumber(d.taxNumber ?? "");

        // ✅ adres: default varsa onu al, yoksa ilkini al
        const addrs = (d.addresses ?? []) as DealerAddressDto[];
        const picked = addrs.find((a) => a.isDefault) ?? addrs[0] ?? null;

        if (picked) {
          setAddressId(picked.id);
          setAddressLine1(picked.addressLine1 ?? "");
          setAddressLine2(picked.addressLine2 ?? "");
          setCity(picked.city ?? "");
          setDistrict(picked.district ?? "");
          setCountry(picked.country ?? "Türkiye");
          setPostalCode(picked.postalCode ?? "");
        } else {
          setAddressId(null);
          setAddressLine1("");
          setAddressLine2("");
          setCity("");
          setDistrict("");
          setCountry("Türkiye");
          setPostalCode("");
        }
      } catch (e: any) {
        setErr(e?.message ?? "Hata oluştu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [idStr]);

  // ✅ TaxNumber debounce check (excludeId ile)
  useEffect(() => {
    if (!idStr) return;

    const t = setTimeout(async () => {
      const tn = taxNumber.trim();

      if (!tn) {
        setTaxAvailable(null);
        setTaxMsg("");
        return;
      }

      setTaxChecking(true);
      try {
        const res = await apiJson<TaxCheckResponse>(
          `/api/supervisor/dealers/check-tax-number?taxNumber=${encodeURIComponent(
            tn
          )}&excludeId=${encodeURIComponent(idStr)}`
        );
        setTaxAvailable(!!res.available);
        setTaxMsg(res.message ?? (res.available ? "Uygun" : "Kullanılıyor"));
      } catch (e: any) {
        setTaxAvailable(null);
        setTaxMsg(e?.message ?? "Kontrol edilemedi.");
      } finally {
        setTaxChecking(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [taxNumber, idStr]);

  const canSubmit = useMemo(() => {
    const basics =
      dealerCode.trim().length > 0 &&
      dealerName.trim().length > 0 &&
      taxOffice.trim().length > 0 &&
      taxNumber.trim().length > 0 &&
      addressLine1.trim().length > 0 &&
      city.trim().length > 0 &&
      country.trim().length > 0;

    const taxOk = taxAvailable !== false;
    return basics && taxOk && !saving && !loading;
  }, [
    dealerCode,
    dealerName,
    taxOffice,
    taxNumber,
    addressLine1,
    city,
    country,
    taxAvailable,
    saving,
    loading,
  ]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => (b.name ?? "").toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const selectedBrandChips = useMemo(() => {
    const map = new Map(brands.map((b) => [b.id, b]));
    return brandIds.map((bid) => map.get(bid)).filter(Boolean) as LookupItem[];
  }, [brandIds, brands]);

  function toggleBrand(bid: number) {
    setBrandIds((prev) =>
      prev.includes(bid) ? prev.filter((x) => x !== bid) : [...prev, bid]
    );
  }

  async function onSave() {
    if (!idStr) return;

    setErr(null);
    setOk(null);

    if (taxAvailable === false) {
      setErr("Vergi numarası kullanılmaktadır.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        dealerCode: dealerCode.trim(),
        dealerName: dealerName.trim(),
        commissionRate: clampPercent(commissionRate),
        phoneNumber: phoneNumber.trim() || null,
        email: email.trim() || null,
        isActive,

        taxOffice: taxOffice.trim(),
        taxNumber: taxNumber.trim(),

        brandIds,
        addresses: [
          {
            id: addressId, // ✅ varsa update eder, yoksa insert
            addressTypeId: 1, // ✅ sabit 1
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || null,
            city: city.trim(),
            district: district.trim() || null,
            country: country.trim(),
            postalCode: postalCode.trim() || null,
            isDefault: true, // ✅ tek adres
          },
        ],
      };

      await apiJson<any>(`/api/supervisor/dealers/${idStr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOk("Kayıt başarılı bir şekilde güncellendi.");
      sessionStorage.setItem(
        "happs.toast",
        "Kayıt başarılı bir şekilde güncellendi."
      );
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!idStr) return;
    if (!confirm("Partneri silmek istiyor musun?")) return;

    setErr(null);
    setOk(null);
    setSaving(true);

    try {
      await apiJson<any>(`/api/supervisor/dealers/${idStr}`, {
        method: "DELETE",
      });
      sessionStorage.setItem("happs.toast", "Partner silindi.");
      router.replace("/supervisor/partners");
    } catch (e: any) {
      setErr(e?.message ?? "Silme başarısız.");
    } finally {
      setSaving(false);
    }
  }

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
            Partner Düzenle
          </h1>
          <p className="text-sm text-black/55">#{idStr}</p>
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
            onClick={onDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Sil
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

      {ok && (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {ok}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Partner Kodu
                </label>
                <input
                  value={dealerCode}
                  onChange={(e) => setDealerCode(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Partner Adı
                </label>
                <input
                  value={dealerName}
                  onChange={(e) => setDealerName(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              {/* Tax */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Vergi Dairesi
                </label>
                <input
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Vergi Numarası
                </label>
                <input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {taxChecking ? (
                    <span className="inline-flex items-center gap-1 text-black/50">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kontrol ediliyor...
                    </span>
                  ) : taxAvailable === true ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-4 w-4" />
                      {taxMsg || "Uygun"}
                    </span>
                  ) : taxAvailable === false ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {taxMsg || "Kullanılıyor"}
                    </span>
                  ) : (
                    <span className="text-black/40">{taxMsg || ""}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Komisyon (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={commissionRate}
                  onChange={(e) =>
                    setCommissionRate(parseFloat(e.target.value || "0"))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
                <div className="mt-1 text-xs text-black/45">
                  0 - 100 aralığında.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Telefon
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  E-posta
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-[--foreground]">
              Adres
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Adres Satırı 1
                </label>
                <input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Adres Satırı 2 (opsiyonel)
                </label>
                <input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  İl
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  İlçe
                </label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Ülke
                </label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Posta Kodu
                </label>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-black/45">
              Tek adres yönetiyoruz (varsayılan).
            </div>
          </div>
        </div>

        {/* Right: Brands */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[--foreground]">
                Görülecek Markalar
              </div>

              <button
                type="button"
                onClick={() => setBrandOpen((s) => !s)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
              >
                {brandOpen ? "Kapat" : "Seç"}
              </button>
            </div>

            {selectedBrandChips.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedBrandChips.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => toggleBrand(b.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
                    title="Kaldır"
                    type="button"
                  >
                    {b.name}
                    <span className="text-black/40">×</span>
                  </button>
                ))}
              </div>
            )}

            {brandOpen && (
              <>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                  <input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Marka ara..."
                    className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  />
                </div>

                <div className="max-h-[360px] overflow-auto pr-1">
                  <div className="space-y-1">
                    {filteredBrands.map((b) => {
                      const checked = brandIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBrand(b.id)}
                          className={[
                            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
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
                            {b.name}
                          </span>

                          {checked ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/70">
                              <Check className="h-4 w-4" />
                              Seçildi
                            </span>
                          ) : (
                            <span className="text-xs text-black/40">Seç</span>
                          )}
                        </button>
                      );
                    })}

                    {brands.length === 0 && (
                      <div className="text-sm text-black/50">Marka yok</div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-3 text-xs text-black/45">
              Partner yalnızca seçilen markaları görür / reçete oluşturur.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
