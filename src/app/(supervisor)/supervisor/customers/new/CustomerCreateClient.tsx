"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  X,
  Check,
  AlertTriangle,
  Trash2,
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

type FieldErrors = Record<string, string>;

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
  // basit normalize: boşlukları kaldır, + ve rakam kalsın
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

function customerTypeLabel(id: number) {
  if (id === 1) return "Bireysel";
  if (id === 2) return "Kurumsal";
  if (id === 3) return "Şahıs Şirketi";
  return `#${id}`;
}

export default function CustomerCreateClient() {
  const router = useRouter();

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ UX: alan bazlı hatalar
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // lookups
  const [customerTypes, setCustomerTypes] = useState<LookupItem[]>([]);
  const [dealers, setDealers] = useState<DealerListItemDto[]>([]);

  // form (base)
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

  // ✅ UX: focus refs (ilk hatalı alana götürmek için)
  const customerCodeRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const dealerRef = useRef<HTMLSelectElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const companyNameRef = useRef<HTMLInputElement | null>(null);
  const nationalIdRef = useRef<HTMLInputElement | null>(null);
  const taxOfficeRef = useRef<HTMLInputElement | null>(null);
  const taxNumberRef = useRef<HTMLInputElement | null>(null);
  const addressBlockRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      setErr(null);

      try {
        const [typesRes, dealersRes] = await Promise.all([
          apiJson<any>(`/api/supervisor/customer-types`),
          apiJson<Paged<DealerListItemDto>>(
            `/api/supervisor/dealers?page=1&pageSize=500&q=`
          ),
        ]);

        // types: array veya {items}
        const tItems = (typesRes?.items ?? typesRes ?? []) as any[];
        setCustomerTypes(
          (tItems ?? []).map((x) => ({
            id: x.id ?? x.ID,
            name: x.customerTypeName ?? x.name ?? x.CustomerTypeName ?? "",
            isActive: true,
          }))
        );

        const dItems = (dealersRes?.items ?? []) as DealerListItemDto[];
        setDealers((dItems ?? []).filter((d) => d.isActive));
      } catch (e: any) {
        setErr(e?.message ?? "Lookup verileri yüklenemedi.");
      } finally {
        setLoadingLookups(false);
      }
    })();
  }, []);

  const visibleNameFields = useMemo(() => {
    // 1 bireysel: first/last/national
    // 2 kurumsal: company + tax
    // 3 şahıs şirketi: first/last + tax
    return {
      showPerson: customerTypeId === 1 || customerTypeId === 3,
      showCompany: customerTypeId === 2,
      showTax: customerTypeId === 2 || customerTypeId === 3,
      showNational: customerTypeId === 1, // sadece bireysel
    };
  }, [customerTypeId]);

  // ✅ müşteri tipi değişince o tipe ait hataları temizle (UX)
  useEffect(() => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.personName;
      delete next.companyName;
      delete next.nationalId;
      delete next.tax;
      return next;
    });
    // unique mesajlarını sıfırlamayalım, kullanıcı girdiğini koruyor.
  }, [customerTypeId]);

  // ---- checks: email ----
  useEffect(() => {
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
          `/api/supervisor/customers/check-email?email=${encodeURIComponent(v)}`
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
  }, [email]);

  // ---- checks: phone ----
  useEffect(() => {
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
        // ⚠️ Route: API tarafında param adı "phone" ise burada da phone olmalı.
        // Senin controller: check-phone?phone=
        const res = await apiJson<CheckResponse>(
          `/api/supervisor/customers/check-phone?phone=${encodeURIComponent(v)}`
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
  }, [phoneNumber]);

  // ---- checks: tax ----
  useEffect(() => {
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
          )}`
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
  }, [taxNumber]);

  // ---- checks: national ----
  useEffect(() => {
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
          )}`
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
  }, [nationalId]);

  // ✅ submit anında validasyon (buton disable yerine)
  function validate(): { ok: boolean; first?: keyof FieldErrors } {
    const e: FieldErrors = {};
    let firstKey: keyof FieldErrors | undefined;

    const mark = (key: keyof FieldErrors, msg: string) => {
      if (!firstKey) firstKey = key;
      e[key] = msg;
    };

    if (!customerCode.trim()) mark("customerCode", "Müşteri kodu zorunlu.");

    if (!email.trim()) mark("email", "Email zorunlu.");
    else if (!isEmailLike(email.trim()))
      mark("email", "Email formatı geçersiz.");

    // Danışman zorunlu dedin (kapalı devre partner mantığı)
    if (!currentDealerId) mark("currentDealerId", "Danışman seçiniz.");

    // tip bazlı
    if (visibleNameFields.showPerson) {
      if (!firstName.trim() || !lastName.trim())
        mark("personName", "Ad ve Soyad zorunlu.");
    }
    if (visibleNameFields.showCompany) {
      if (!companyName.trim()) mark("companyName", "Firma ünvanı zorunlu.");
    }
    if (visibleNameFields.showNational) {
      if (!nationalId.trim()) mark("nationalId", "TCKN zorunlu.");
    }
    if (visibleNameFields.showTax) {
      if (!taxOffice.trim() || !taxNumber.trim())
        mark("tax", "Vergi Dairesi ve Vergi Numarası zorunlu.");
    }

    // adres
    if (!addresses.length) {
      mark("addresses", "En az 1 adres zorunlu.");
    } else {
      const bad = addresses.findIndex(
        (a) => !a.addressLine1.trim() || !a.city.trim() || !a.country.trim()
      );
      if (bad >= 0)
        mark(
          "addresses",
          `Adres #${bad + 1} için Adres Satırı 1 / İl / Ülke zorunlu.`
        );
    }

    // uniqueness kontrol sonuçları
    if (emailAvailable === false) mark("email", "Email kullanılmaktadır.");
    if (phoneAvailable === false)
      mark("phoneNumber", "Telefon kullanılmaktadır.");
    if (taxAvailable === false) mark("tax", "Vergi numarası kullanılmaktadır.");
    if (natAvailable === false) mark("nationalId", "TCKN kullanılmaktadır.");

    setFieldErrors(e);

    return { ok: Object.keys(e).length === 0, first: firstKey };
  }

  function focusFirstError(key?: keyof FieldErrors) {
    if (!key) return;

    const focus = (el: HTMLElement | null | undefined) => {
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // @ts-ignore
      if (typeof (el as any).focus === "function") (el as any).focus();
    };

    switch (key) {
      case "customerCode":
        return focus(customerCodeRef.current);
      case "email":
        return focus(emailRef.current);
      case "phoneNumber":
        return focus(phoneRef.current);
      case "currentDealerId":
        return focus(dealerRef.current);
      case "personName":
        return focus(firstNameRef.current ?? lastNameRef.current);
      case "companyName":
        return focus(companyNameRef.current);
      case "nationalId":
        return focus(nationalIdRef.current);
      case "tax":
        return focus(taxOfficeRef.current ?? taxNumberRef.current);
      case "addresses":
        return focus(addressBlockRef.current);
      default:
        return;
    }
  }

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

      const defaultIndex = next.findIndex((a) => a.isDefault);
      if (defaultIndex < 0) next[0].isDefault = true;
      return next;
    });
  }

  async function onSubmit() {
    setErr(null);

    const v = validate();
    if (!v.ok) {
      setErr("Lütfen eksik/hatalı alanları kontrol edin.");
      focusFirstError(v.first);
      return;
    }

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
          id: null,
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

      await apiJson<any>(`/api/supervisor/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      sessionStorage.setItem("happs.toast", "Müşteri oluşturuldu.");
      router.replace("/supervisor/customers");
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled = saving || loadingLookups;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Yeni Müşteri
          </h1>
          <p className="text-sm text-black/55"></p>
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
            disabled={saveDisabled}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
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

      {loadingLookups && (
        <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/70">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Lookup verileri
            yükleniyor...
          </span>
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
                  ref={customerCodeRef}
                  value={customerCode}
                  onChange={(e) => {
                    setCustomerCode(e.target.value);
                    if (fieldErrors.customerCode)
                      setFieldErrors((p) => {
                        const n = { ...p };
                        delete n.customerCode;
                        return n;
                      });
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                />
                {fieldErrors.customerCode && (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.customerCode}
                  </div>
                )}
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
                      {t.name || customerTypeLabel(t.id)}
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
                      ref={firstNameRef}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (fieldErrors.personName)
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.personName;
                            return n;
                          });
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Soyad
                    </label>
                    <input
                      ref={lastNameRef}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (fieldErrors.personName)
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.personName;
                            return n;
                          });
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                    />
                    {fieldErrors.personName && (
                      <div className="mt-1 text-xs text-red-600">
                        {fieldErrors.personName}
                      </div>
                    )}
                  </div>
                </>
              )}

              {visibleNameFields.showCompany && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    Firma Ünvanı
                  </label>
                  <input
                    ref={companyNameRef}
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (fieldErrors.companyName)
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.companyName;
                          return n;
                        });
                    }}
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                  />
                  {fieldErrors.companyName && (
                    <div className="mt-1 text-xs text-red-600">
                      {fieldErrors.companyName}
                    </div>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Email
                </label>
                <input
                  ref={emailRef}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors((p) => {
                        const n = { ...p };
                        delete n.email;
                        return n;
                      });
                  }}
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
                {fieldErrors.email && (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Telefon
                </label>
                <input
                  ref={phoneRef}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (fieldErrors.phoneNumber)
                      setFieldErrors((p) => {
                        const n = { ...p };
                        delete n.phoneNumber;
                        return n;
                      });
                  }}
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
                {fieldErrors.phoneNumber && (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.phoneNumber}
                  </div>
                )}
              </div>

              {/* CurrentDealer */}
              <div>
                <label className="mb-2 block text-sm font-medium text-black/70">
                  Danışman
                </label>
                <select
                  ref={dealerRef}
                  value={currentDealerId ?? ""}
                  onChange={(e) => {
                    setCurrentDealerId(
                      e.target.value ? Number(e.target.value) : null
                    );
                    if (fieldErrors.currentDealerId)
                      setFieldErrors((p) => {
                        const n = { ...p };
                        delete n.currentDealerId;
                        return n;
                      });
                  }}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                >
                  <option value="">Seçilmedi</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealerName} ({d.dealerCode})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-black/45">
                  Müşterinin bağlı olduğu / yönlendirildiği danışman.
                </div>
                {fieldErrors.currentDealerId && (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.currentDealerId}
                  </div>
                )}
              </div>

              {/* National ID */}
              {visibleNameFields.showNational && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-black/70">
                    TCKN
                  </label>
                  <input
                    ref={nationalIdRef}
                    value={nationalId}
                    onChange={(e) => {
                      setNationalId(e.target.value);
                      if (fieldErrors.nationalId)
                        setFieldErrors((p) => {
                          const n = { ...p };
                          delete n.nationalId;
                          return n;
                        });
                    }}
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
                  {fieldErrors.nationalId && (
                    <div className="mt-1 text-xs text-red-600">
                      {fieldErrors.nationalId}
                    </div>
                  )}
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
                      ref={taxOfficeRef}
                      value={taxOffice}
                      onChange={(e) => {
                        setTaxOffice(e.target.value);
                        if (fieldErrors.tax)
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.tax;
                            return n;
                          });
                      }}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#845ec2]/30 focus:ring-4 focus:ring-[#b39cd0]/25"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black/70">
                      Vergi Numarası
                    </label>
                    <input
                      ref={taxNumberRef}
                      value={taxNumber}
                      onChange={(e) => {
                        setTaxNumber(e.target.value);
                        if (fieldErrors.tax)
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.tax;
                            return n;
                          });
                      }}
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
                    {fieldErrors.tax && (
                      <div className="mt-1 text-xs text-red-600">
                        {fieldErrors.tax}
                      </div>
                    )}
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
          <div
            ref={addressBlockRef}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[--foreground]">
                  Adresler
                </div>
                <div className="text-xs text-black/45">
                  Birden fazla adres ekleyebilirsin. “Varsayılan” tek olmalı.
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

            {fieldErrors.addresses && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700">
                {fieldErrors.addresses}
              </div>
            )}

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
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => idx > 0 && swapAddresses(idx, idx - 1)}
                        disabled={idx === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                        title="Yukarı taşı"
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
                        title="Aşağı taşı"
                      >
                        <ArrowUpDown className="h-4 w-4 -rotate-90" />
                        Aşağı
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAddress(idx)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        title="Sil"
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
                        İlçe
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
                        Ülke (Country)
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
            <div className="text-sm font-semibold text-[--foreground]">
              Kurallar
            </div>
            <div className="mt-2 text-sm text-black/60 space-y-2">
              <div>• Email zorunlu.</div>
              <div>• Danışman seçimi zorunlu.</div>
              <div>• TCKN Bireysel ise zorunlu.</div>
              <div>• Vergi No (Kurumsal / Şahıs Firması) doluysa zorunlu.</div>
              <div>• En az 1 adres zorunlu.</div>
            </div>
          </div>

          {/* küçük özet kutusu (opsiyonel ama güzel) */}
          {!!Object.keys(fieldErrors).length && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
              Eksik/Hatalı alanlar var. Lütfen formu kontrol edin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
