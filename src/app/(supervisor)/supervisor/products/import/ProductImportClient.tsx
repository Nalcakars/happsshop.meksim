"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";

type ImportError = {
  row: number;
  productCode: string;
  error: string;
};

type ImportResult = {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: ImportError[];
};

function normalizeResult(res: any): ImportResult {
  const normalized: ImportResult = {
    totalRows: res?.totalRows ?? res?.TotalRows ?? 0,
    successRows: res?.successRows ?? res?.SuccessRows ?? 0,
    failedRows: res?.failedRows ?? res?.FailedRows ?? 0,
    errors: (res?.errors ?? res?.Errors ?? []) as any[],
  };

  normalized.errors = (normalized.errors ?? []).map((x: any) => ({
    row: x?.row ?? x?.Row ?? 0,
    productCode: x?.productCode ?? x?.ProductCode ?? "",
    error: x?.error ?? x?.Error ?? "",
  }));

  return normalized;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...(init ?? {}) });

  if (r.status === 401) {
    window.location.href = "/supervisor/login";
    throw new Error("Unauthorized");
  }

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message ?? "İstek başarısız.");
  return data as T;
}

function ResultPanel({ result }: { result: ImportResult }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="text-xs text-black/50">Toplam Satır</div>
          <div className="text-xl font-semibold text-black">
            {result.totalRows}
          </div>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Başarılı
          </div>
          <div className="text-xl font-semibold text-green-800">
            {result.successRows}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Hatalı
          </div>
          <div className="text-xl font-semibold text-amber-900">
            {result.failedRows}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-[--foreground]">
          Hata Listesi
        </div>

        {result.errors.length === 0 ? (
          <div className="text-sm text-black/50">
            Hata yok, Tüm satırlar işlendi.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-black/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-black/10">
                  <th className="px-3 py-2 text-xs font-semibold text-black/60">
                    Row
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-black/60">
                    ProductCode
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-black/60">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, idx) => (
                  <tr
                    key={`${e.row}-${idx}`}
                    className="border-b border-black/5"
                  >
                    <td className="px-3 py-2 text-black/70">{e.row}</td>
                    <td className="px-3 py-2 font-semibold text-black">
                      {e.productCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-red-700">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-xs text-black/50">
          İpucu: Excel’de bir alanı boş bırakırsan, mevcut değer korunur. Sadece
          dolu gelen alanlar güncellenir.
        </div>
      </div>
    </div>
  );
}

function ImportCard({
  title,
  description,
  templateUrl,
  endpoint,
  disabled,
  disabledHint,
}: {
  title: string;
  description?: string;
  templateUrl: string;
  endpoint: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const canUpload = useMemo(
    () => !!file && !uploading && !disabled,
    [file, uploading, disabled]
  );

  function clearAll() {
    setFile(null);
    setErr(null);
    setResult(null);
  }

  async function onUpload() {
    if (!file) return;

    setUploading(true);
    setErr(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await apiJson<any>(endpoint, {
        method: "POST",
        body: form,
      });

      setResult(normalizeResult(res));
    } catch (e: any) {
      setErr(e?.message ?? "Import başarısız.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[--foreground]">
            {title}
          </div>
          {description ? (
            <div className="text-xs text-black/55">{description}</div>
          ) : (
            <div className="text-xs text-black/55">&nbsp;</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={templateUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            title="Şablonu indir"
          >
            <Download className="h-4 w-4" />
            Şablon İndir
          </a>

          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            disabled={uploading}
          >
            Temizle
          </button>
        </div>
      </div>

      {disabled && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          {disabledHint ?? "Bu alan henüz aktif değil."}
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/70 hover:bg-black/[0.03]">
          <Upload className="h-4 w-4" />
          Excel Seç
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setErr(null);
              setResult(null);
            }}
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="text-sm text-black/70">
            {file ? (
              <>
                <span className="font-semibold">{file.name}</span>{" "}
                <span className="text-black/50">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </>
            ) : (
              <span className="text-black/50">Henüz dosya seçilmedi.</span>
            )}
          </div>

          <button
            onClick={onUpload}
            disabled={!canUpload}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Yükle
          </button>
        </div>
      </div>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

export default function ProductImportClient() {
  const router = useRouter();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">
            Excel ile Aktarım
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
          >
            <X className="h-4 w-4" />
            Geri
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* PRODUCTS (Mevcut) */}
        <ImportCard
          title="Ürün Yükleme"
          templateUrl="https://storage.happsplan.com/meksim.com.tr/Data/Templates/ProductTemplate.xlsx"
          endpoint="/api/supervisor/imports/products"
        />

        {/* PRICES (Yeni) */}
        <ImportCard
          title="Fiyat Yükleme"
          templateUrl="https://storage.happsplan.com/meksim.com.tr/Data/Templates/PriceTemplate.xlsx"
          endpoint="/api/supervisor/imports/prices"
        />

        {/* STOCK (Sonraki adım) */}
        <ImportCard
          title="Stok Yükleme"
          templateUrl="https://storage.happsplan.com/meksim.com.tr/Data/Templates/StockTemplate.xlsx"
          endpoint="/api/supervisor/imports/stocks"
        />
      </div>
    </div>
  );
}
