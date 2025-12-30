"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Plus,
  ArrowUpDown,
} from "lucide-react";

type LookupItem = { id: number; name: string; isActive?: boolean };

type DealerListItemDto = {
  id: number;
  dealerCode: string;
  dealerName: string;
  isActive: boolean;
};

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type CheckResponse = { available: boolean; message?: string };

type CustomerAddressDto = {
  id: number;
  addressTypeID?: number | null;
  addressTypeId?: number | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  district?: string | null;
  country: string;
  postalCode?: string | null;
  isDefault: boolean;
};

type CustomerDetailDto = {
  id: number;
  customerCode: string;
  customerTypeID?: number;
  customerTypeId?: number;

  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;

  email: string;
  phoneNumber?: string | null;

  nationalID?: string | null;
  nationalId?: string | null;

  taxOffice?: string | null;
  taxNumber?: string | null;

  currentDealerID?: number | null;
  currentDealerId?: number | null;

  isActive: boolean;
  createdAt: string;

  addresses: CustomerAddressDto[];
};

type AddressForm = {
  id: number | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
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

function normalizePhone(s: string) {
  return (s ?? "").trim().replace(/\s+/g, "");
}

function isEmailLike(s: string) {
  const v = (s ?? "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function makeEmptyAddress(isDefault: boolean): AddressForm {
  return {
    id: null,
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    country: "Türkiye",
    postalCode: "",
    isDefault,
  };
}

function ensureSingleDefault(list: AddressForm[], desiredIndex: number) {
  return list.map((a, i) => ({ ...a, isDefault: i === desiredIndex }));
}

export default function CustomerEditClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idStr = params?.id;
  const id = idStr ? Number(idStr) : NaN;

  const [loading, setLoading] = useState(true);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // lookups
  const [customerTypes, setCustomerTypes] = useState<LookupItem[]>([]);
  const [dealers, setDealers] = useState<DealerListItemDto[]>([]);

  // form
  const [customerCode, setCustomerCode] = useState("");
  const [customerTypeId, setCustomerTypeId] = useState<number>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [nationalId, setNationalId] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [currentDealerId, setCurrentDealerId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);

  // addresses
  const [addresses, setAddresses] = useState<AddressForm[]>([
    makeEmptyAddress(true),
  ]);

  // uniqueness checks
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailMsg, setEmailMsg] = useState("");

  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [phoneMsg, setPhoneMsg] = useState("");

  const [taxChecking, setTaxChecking] = useState(false);
  const [taxAvailable, setTaxAvailable] = useState<boolean | null>(null);
  const [taxMsg, setTaxMsg] = useState("");

  const [natChecking, setNatChecking] = useState(false);
  const [natAvailable, setNatAvailable] = useState<boolean | null>(null);
  const [natMsg, setNatMsg] = useState("");

  // debounce seq guards
  const emailSeq = useRef(0);
  const phoneSeq = useRef(0);
  const taxSeq = useRef(0);
  const natSeq = useRef(0);

  const visibleNameFields = useMemo(() => {
    return {
      showPerson: customerTypeId === 1 || customerTypeId === 3,
      showCompany: customerTypeId === 2,
      showTax: customerTypeId === 2 || customerTypeId === 3,
      showNational: customerTypeId === 1,
    };
  }, [customerTypeId]);

  useEffect(() => {
    if (!idStr || !Number.isFinite(id)) return;

    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);

      try {
        const [detail, typesRes, dealersRes] = await Promise.all([
          apiJson<CustomerDetailDto>(`/api/supervisor/customers/${idStr}`),
          apiJson<any>(`/api/supervisor/customer-types`),
          apiJson<Paged<DealerListItemDto>>(
            `/api/supervisor/dealers?page=1&pageSize=500&q=`
          ),
        ]);

        // types
        const tItems = (typesRes?.items ?? typesRes ?? []) as any[];
        setCustomerTypes(
          (tItems ?? []).map((x) => ({
            id: x.id ?? x.ID,
            name: x.customerTypeName ?? x.name ?? x.CustomerTypeName ?? "",
            isActive: true,
          }))
        );

        // dealers
        const dItems = (dealersRes?.items ?? []) as DealerListItemDto[];
        setDealers((dItems ?? []).filter((d) => d.isActive));

        const d = detail as any;

        setCustomerCode(d.customerCode ?? d.CustomerCode ?? "");
        setCustomerTypeId(
          Number(d.customerTypeId ?? d.customerTypeID ?? d.CustomerTypeID ?? 1)
        );

        setFirstName(d.firstName ?? d.FirstName ?? "");
        setLastName(d.lastName ?? d.LastName ?? "");
        setCompanyName(d.companyName ?? d.CompanyName ?? "");

        setEmail(d.email ?? d.Email ?? "");
        setPhoneNumber(d.phoneNumber ?? d.PhoneNumber ?? "");

        setNationalId(d.nationalId ?? d.nationalID ?? d.NationalID ?? "");
        setTaxOffice(d.taxOffice ?? d.TaxOffice ?? "");
        setTaxNumber(d.taxNumber ?? d.TaxNumber ?? "");

        setCurrentDealerId(
          d.currentDealerId ?? d.currentDealerID ?? d.CurrentDealerID ?? null
        );
        setIsActive(!!(d.isActive ?? d.IsActive ?? true));

        // addresses
        const addrs = (d.addresses ??
          d.Addresses ??
          []) as CustomerAddressDto[];
        const mapped: AddressForm[] =
          (addrs ?? []).map((a) => ({
            id: a.id ?? (a as any).ID ?? null,
            addressLine1: a.addressLine1 ?? "",
            addressLine2: a.addressLine2 ?? "",
            city: a.city ?? "",
            district: a.district ?? "",
            country: a.country ?? "Türkiye",
            postalCode: a.postalCode ?? "",
            isDefault: !!a.isDefault,
          })) ?? [];

        if (!mapped.length) {
          setAddresses([makeEmptyAddress(true)]);
        } else {
          // tek default garanti
          const defIdx = mapped.findIndex((x) => x.isDefault);
          if (defIdx < 0) mapped[0] = { ...mapped[0], isDefault: true };
          setAddresses(ensureSingleDefault(mapped, Math.max(defIdx, 0)));
        }
      } catch (e: any) {
        setErr(e?.message ?? "Yükleme hatası.");
      } finally {
        setLoading(false);
        setLoadingLookups(false);
      }
    })();
  }, [idStr, id]);

  // ---- checks: email ----
  useEffect(() => {
    if (!idStr) return;

    const v = email.trim();
    const seq = ++emailSeq.current;

    const t = setTimeout(async () => {
      if (!v) {
        setEmailAvailable(null);
        setEmailMsg("");
        return;
      }

      if (!isEmailLike(v)) {
        setEmailAvailable(null);
        setEmailMsg("Email formatı geçersiz.");
        return;
      }

      setEmailChecking(true);
      try {
        const res = await apiJson<CheckResponse>(
          `/api/supervisor/customers/check-email?email=${encodeURIComponent(
            v
          )}&excludeId=${encodeURIComponent(idStr)}`
        );
        if (emailSeq.current !== seq) return;
        setEmailAvailable(!!res.available);
        setEmailMsg(res.message ?? (res.available ? "Uygun" : "Kullanılıyor"));
      } catch (e: any) {
        if (emailSeq.current !== seq) return;
        setEmailAvailable(null);
        setEmailMsg(e?.message ?? "Kontrol edilemedi.");
      } finally {
        if (emailSeq.current === seq) setEmailChecking(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [email, idStr]);

  // ---- checks: phone ----
  useEffect(() => {
    if (!idStr) return;

    const v = normalizePhone(phoneNumber);
    const seq = ++phoneSeq.current;

    const t = setTimeout(async () => {
      if (!v) {
        setPhoneAvailable(null);
        setPhoneMsg("");
        return;
      }

      setPhoneChecking(true);
      try {
        const res = await apiJson<CheckResponse>(
          `/api/supervisor/customers/check-phone?phoneNumber=${encodeURIComponent(
            v
          )}&excludeId=${encodeURIComponent(idStr)}`
        );
        if (phoneSeq.current !== seq) return;
        setPhoneAvailable(!!res.available);
        setPhoneMsg(res.message ?? (res.available ? "Uygun" : "Kullanılıyor"));
      } catch (e: any) {
        if (phoneSeq.current !== seq) return;
        setPhoneAvailable(null);
        setPhoneMsg(e?.message ?? "Kontrol edilemedi.");
      } finally {
        if (phoneSeq.current === seq) setPhoneChecking(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [phoneNumber, idStr]);

  // ---- checks: tax ----
  useEffect(() => {
    if (!idStr) return;

    const v = taxNumber.trim();
    const seq = ++taxSeq.current;

    const t = setTimeout(async () => {
      if (!v) {
        setTaxAvailable(null);
        setTaxMsg("");
        return;
      }

      setTaxChecking(true);
      try {
        const res = await apiJson<CheckResponse>(
          `/api/supervisor/customers/check-tax-number?taxNumber=${encodeURIComponent(
            v
          )}&excludeId=${encodeURIComponent(idStr)}`
        );
        if (taxSeq.current !== seq) return;
        setTaxAvailable(!!res.available);
        setTaxMsg(res.message ?? (res.available ? "Uygun" : "Kullanılıyor"));
      } catch (e: any) {
        if (taxSeq.current !== seq) return;
        setTaxAvailable(null);
        setTaxMsg(e?.message ?? "Kontrol edilemedi.");
      } finally {
        if (taxSeq.current === seq) setTaxChecking(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [taxNumber, idStr]);

  // ---- checks: national ----
  useEffect(() => {
    if (!idStr) return;

    const v = nationalId.trim();
    const seq = ++natSeq.current;

    const t = setTimeout(async () => {
      if (!v) {
        setNatAvailable(null);
        setNatMsg("");
        return;
      }

      setNatChecking(true);
      try {
        const res = await apiJson<CheckResponse>(
          `/api/supervisor/customers/check-national-id?nationalId=${encodeURIComponent(
            v
          )}&excludeId=${encodeURIComponent(idStr)}`
        );
        if (natSeq.current !== seq) return;
        setNatAvailable(!!res.available);
        setNatMsg(res.message ?? (res.available ? "Uygun" : "Kullanılıyor"));
      } catch (e: any) {
        if (natSeq.current !== seq) return;
        setNatAvailable(null);
        setNatMsg(e?.message ?? "Kontrol edilemedi.");
      } finally {
        if (natSeq.current === seq) setNatChecking(false);
      }
    }, 450);

    return () => clearTimeout(t);
  }, [nationalId, idStr]);

  const addressValid = useMemo(() => {
    if (!addresses.length) return false;
    return addresses.every(
      (a) =>
        a.addressLine1.trim().length > 0 &&
        a.city.trim().length > 0 &&
        a.country.trim().length > 0
    );
  }, [addresses]);

  const formValid = useMemo(() => {
    const baseOk =
      customerCode.trim().length > 0 &&
      Number.isFinite(customerTypeId) &&
      email.trim().length > 0 &&
      isEmailLike(email.trim()) &&
      addressValid;

    const typeOk =
      (visibleNameFields.showCompany ? companyName.trim().length > 0 : true) &&
      (visibleNameFields.showPerson
        ? firstName.trim().length > 0 && lastName.trim().length > 0
        : true) &&
      (visibleNameFields.showTax
        ? taxOffice.trim().length > 0 && taxNumber.trim().length > 0
        : true) &&
      (visibleNameFields.showNational ? nationalId.trim().length > 0 : true);

    const uniqueOk =
      emailAvailable !== false &&
      phoneAvailable !== false &&
      taxAvailable !== false &&
      natAvailable !== false;

    return baseOk && typeOk && uniqueOk && !saving && !loading;
  }, [
    customerCode,
    customerTypeId,
    email,
    addressValid,
    visibleNameFields.showCompany,
    visibleNameFields.showPerson,
    visibleNameFields.showTax,
    visibleNameFields.showNational,
    companyName,
    firstName,
    lastName,
    taxOffice,
    taxNumber,
    nationalId,
    emailAvailable,
    phoneAvailable,
    taxAvailable,
    natAvailable,
    saving,
    loading,
  ]);

  function setDefaultAddress(idx: number) {
    setAddresses((prev) => ensureSingleDefault([...prev], idx));
  }

  function addAddress() {
    setAddresses((prev) => {
      const next = [...prev];
      next.push(makeEmptyAddress(false));
      return next;
    });
  }

  function removeAddress(idx: number) {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (!next.length) return [makeEmptyAddress(true)];
      const hasDefault = next.some((a) => a.isDefault);
      if (!hasDefault) next[0] = { ...next[0], isDefault: true };
      return next;
    });
  }

  function swapAddresses(i: number, j: number) {
    setAddresses((prev) => {
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;

      const defIdx = next.findIndex((x) => x.isDefault);
      if (defIdx < 0) next[0].isDefault = true;
      return next;
    });
  }

  async function onSave() {
    if (!idStr) return;

    setErr(null);
    setOk(null);

    if (emailAvailable === false) return setErr("Email kullanılmaktadır.");
    if (phoneAvailable === false) return setErr("Telefon kullanılmaktadır.");
    if (taxAvailable === false)
      return setErr("Vergi numarası kullanılmaktadır.");
    if (natAvailable === false) return setErr("TCKN kullanılmaktadır.");

    setSaving(true);
    try {
      const payload = {
        customerCode: customerCode.trim(),
        customerTypeId: customerTypeId,
        firstName: visibleNameFields.showPerson ? firstName.trim() : null,
        lastName: visibleNameFields.showPerson ? lastName.trim() : null,
        companyName: visibleNameFields.showCompany ? companyName.trim() : null,

        email: email.trim(),
        phoneNumber: normalizePhone(phoneNumber) || null,

        nationalId: visibleNameFields.showNational ? nationalId.trim() : null,
        taxOffice: visibleNameFields.showTax ? taxOffice.trim() : null,
        taxNumber: visibleNameFields.showTax ? taxNumber.trim() : null,

        currentDealerId: currentDealerId ?? null,
        isActive,

        addresses: addresses.map((a) => ({
          id: a.id, // varsa update, yoksa insert
          addressTypeId: 1, // sabit
          addressLine1: a.addressLine1.trim(),
          addressLine2: a.addressLine2.trim() || null,
          city: a.city.trim(),
          district: a.district.trim() || null,
          country: a.country.trim(),
          postalCode: a.postalCode.trim() || null,
          isDefault: !!a.isDefault,
        })),
      };

      await apiJson<any>(`/api/supervisor/customers/${idStr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOk("Kayıt güncellendi.");
      sessionStorage.setItem("happs.toast", "Müşteri güncellendi.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!idStr) return;
    if (!confirm("Müşteriyi silmek istiyor musun?")) return;

    setErr(null);
    setOk(null);
    setSaving(true);

    try {
      await apiJson<any>(`/api/supervisor/customers/${idStr}`, {
        method: "DELETE",
      });
      sessionStorage.setItem("happs.toast", "Müşteri silindi.");
      router.replace("/supervisor/customers");
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
            Müşteri Düzenle
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
            disabled={!formValid}
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
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Müşteri Kodu
                </label>
                <input
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Müşteri Tipi
                </label>
                <select
                  value={customerTypeId}
                  onChange={(e) => setCustomerTypeId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                >
                  {(customerTypes.length
                    ? customerTypes
                    : [
                        { id: 1, name: "Bireysel" },
                        { id: 2, name: "Kurumsal" },
                        { id: 3, name: "Şahıs Şirketi" },
                      ]
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `#${t.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {visibleNameFields.showPerson && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Ad
                    </label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Soyad
                    </label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                    />
                  </div>
                </>
              )}

              {visibleNameFields.showCompany && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Firma Ünvanı
                  </label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  />
                </div>
              )}

              {/* Email */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {emailChecking ? (
                    <span className="inline-flex items-center gap-1 text-black/50">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kontrol ediliyor...
                    </span>
                  ) : emailAvailable === true ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-4 w-4" />
                      {emailMsg || "Uygun"}
                    </span>
                  ) : emailAvailable === false ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {emailMsg || "Kullanılıyor"}
                    </span>
                  ) : (
                    <span className="text-black/40">{emailMsg || ""}</span>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Telefon (opsiyonel)
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {phoneChecking ? (
                    <span className="inline-flex items-center gap-1 text-black/50">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Kontrol ediliyor...
                    </span>
                  ) : phoneAvailable === true ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-4 w-4" />
                      {phoneMsg || "Uygun"}
                    </span>
                  ) : phoneAvailable === false ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {phoneMsg || "Kullanılıyor"}
                    </span>
                  ) : (
                    <span className="text-black/40">{phoneMsg || ""}</span>
                  )}
                </div>
              </div>

              {/* Dealer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Dealer (opsiyonel)
                </label>
                <select
                  value={currentDealerId ?? ""}
                  onChange={(e) =>
                    setCurrentDealerId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                >
                  <option value="">Seçilmedi</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealerName} ({d.dealerCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* National */}
              {visibleNameFields.showNational && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    TCKN
                  </label>
                  <input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  />
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {natChecking ? (
                      <span className="inline-flex items-center gap-1 text-black/50">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Kontrol ediliyor...
                      </span>
                    ) : natAvailable === true ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="h-4 w-4" />
                        {natMsg || "Uygun"}
                      </span>
                    ) : natAvailable === false ? (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        {natMsg || "Kullanılıyor"}
                      </span>
                    ) : (
                      <span className="text-black/40">{natMsg || ""}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Tax */}
              {visibleNameFields.showTax && (
                <>
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
                </>
              )}

              {/* IsActive */}
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

          {/* Addresses */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[--foreground]">
                  Adresler
                </div>
                <div className="text-xs text-black/45">
                  Birden fazla adres + tek varsayılan.
                </div>
              </div>

              <button
                type="button"
                onClick={addAddress}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03]"
              >
                <Plus className="h-4 w-4" />
                Adres Ekle
              </button>
            </div>

            <div className="space-y-4">
              {addresses.map((a, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-black/10 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70">
                        <input
                          type="radio"
                          name="defaultAddress"
                          checked={a.isDefault}
                          onChange={() => setDefaultAddress(idx)}
                        />
                        Varsayılan
                      </label>
                      <span className="text-xs text-black/45">#{idx + 1}</span>
                      {a.id ? (
                        <span className="text-xs text-black/40">
                          ID: {a.id}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => idx > 0 && swapAddresses(idx, idx - 1)}
                        disabled={idx === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                      >
                        <ArrowUpDown className="h-4 w-4 rotate-90" />
                        Yukarı
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          idx < addresses.length - 1 &&
                          swapAddresses(idx, idx + 1)
                        }
                        disabled={idx === addresses.length - 1}
                        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                      >
                        <ArrowUpDown className="h-4 w-4 -rotate-90" />
                        Aşağı
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAddress(idx)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Adres Satırı 1
                      </label>
                      <input
                        value={a.addressLine1}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, addressLine1: e.target.value }
                                : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Adres Satırı 2 (opsiyonel)
                      </label>
                      <input
                        value={a.addressLine2}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, addressLine2: e.target.value }
                                : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        İl
                      </label>
                      <input
                        value={a.city}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, city: e.target.value } : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        İlçe (District)
                      </label>
                      <input
                        value={a.district}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, district: e.target.value } : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Ülke
                      </label>
                      <input
                        value={a.country}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, country: e.target.value } : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-black/70">
                        Posta Kodu
                      </label>
                      <input
                        value={a.postalCode}
                        onChange={(e) =>
                          setAddresses((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, postalCode: e.target.value }
                                : x
                            )
                          )
                        }
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-black/45"></div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-[--foreground]">Not</div>
            <div className="mt-2 text-sm text-black/60 space-y-2">
              <div>• Unique check endpointleri input sırasında çalışır.</div>
              <div>• Kaydet’e basınca unique false ise bloklanır.</div>
              <div>• Varsayılan adres tek seçilir.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
