"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type WarehouseRow = {
  id: number;
  warehouseCode: string;
  name: string;
  isActive: boolean;
};

type WarehouseDetail = {
  id: number;
  warehouseCode: string;
  isActive: boolean;
  createdAt: string;
  languages: { languageCode: string; name: string }[];
};

type WarehouseUpsertDto = {
  warehouseCode: string;
  name: string;
  isActive: boolean;
};

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

function normalizeRow(x: any): WarehouseRow {
  return {
    id: x.id ?? x.ID ?? 0,
    warehouseCode: x.warehouseCode ?? x.WarehouseCode ?? "",
    name: x.name ?? x.Name ?? "",
    isActive: x.isActive ?? x.IsActive ?? false,
  };
}

export default function WarehousesClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [showInactive, setShowInactive] = useState(false);

  // modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<WarehouseUpsertDto>({
    warehouseCode: "",
    name: "",
    isActive: true,
  });

  const canSave = useMemo(() => {
    return (
      !saving &&
      form.warehouseCode.trim().length > 0 &&
      form.name.trim().length > 0
    );
  }, [saving, form]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      qs.set("lang", "tr");
      // API default isActive=true ama biz net gönderelim
      qs.set("isActive", showInactive ? "" : "true");

      const url = showInactive
        ? `/api/supervisor/warehouses?lang=tr`
        : `/api/supervisor/warehouses?lang=tr&isActive=true`;

      const res = await apiJson<any[]>(url);
      setRows((res ?? []).map(normalizeRow));
    } catch (e: any) {
      setErr(e?.message ?? "Yükleme başarısız.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm({ warehouseCode: "", name: "", isActive: true });
    setErr(null);
    setOpen(true);
  }

  async function openEdit(id: number) {
    setMode("edit");
    setEditingId(id);
    setErr(null);
    setOpen(true);
    setSaving(true);

    try {
      const detail = await apiJson<WarehouseDetail>(
        `/api/supervisor/warehouses/${id}`
      );
      const tr = (detail.languages ?? []).find(
        (l) => (l.languageCode ?? "").toLowerCase() === "tr"
      );

      setForm({
        warehouseCode: detail.warehouseCode ?? "",
        name: tr?.name ?? detail.warehouseCode ?? "",
        isActive: !!detail.isActive,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Detay yüklenemedi.");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    if (!canSave) return;

    setSaving(true);
    setErr(null);

    try {
      const payload: WarehouseUpsertDto = {
        warehouseCode: form.warehouseCode.trim(),
        name: form.name.trim(),
        isActive: form.isActive,
      };

      if (mode === "create") {
        await apiJson(`/api/supervisor/warehouses?lang=tr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const id = editingId!;
        await apiJson(`/api/supervisor/warehouses/${id}?lang=tr`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function softDelete(id: number) {
    if (!confirm("Bu depoyu pasife almak istiyor musun?")) return;

    setErr(null);
    try {
      await apiJson(`/api/supervisor/warehouses/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Silme başarısız.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[--foreground]">Depolar</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
          >
            <X className="h-4 w-4" />
            Geri
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Yenile
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60"
          >
            <Plus className="h-4 w-4" />
            Yeni Depo
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-[--foreground]">
            Depo Listesi
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4"
            />
            Pasif depoları da göster
          </label>
        </div>

        <div className="overflow-auto rounded-xl border border-black/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-black/10">
                <th className="px-3 py-2 text-xs font-semibold text-black/60">
                  ID
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-black/60">
                  Depo Kodu
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-black/60">
                  Depo Adı (TR)
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-black/60">
                  Durum
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-black/60 text-right">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-black/50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-black/50"
                  >
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="border-b border-black/5">
                    <td className="px-3 py-2 text-black/70">{w.id}</td>
                    <td className="px-3 py-2 font-semibold text-black">
                      {w.warehouseCode}
                    </td>
                    <td className="px-3 py-2 text-black/80">{w.name}</td>
                    <td className="px-3 py-2">
                      {w.isActive ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" /> Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(w.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/70 hover:bg-black/[0.03]"
                        >
                          <Pencil className="h-4 w-4" />
                          Düzenle
                        </button>
                        <button
                          onClick={() => softDelete(w.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-white px-3 py-2 text-xs text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Pasife Al
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
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-[--foreground]">
                {mode === "create" ? "Yeni Depo" : `Depo Düzenle #${editingId}`}
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl border border-black/10 bg-white p-2 text-black/60 hover:bg-black/[0.03]"
                disabled={saving}
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <div className="mb-1 text-xs font-semibold text-black/60">
                  WarehouseCode
                </div>
                <input
                  value={form.warehouseCode}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, warehouseCode: e.target.value }))
                  }
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#845ec2]/45"
                  placeholder="Örn: MERKEZ"
                  disabled={saving}
                />
              </div>

              <div className="sm:col-span-1">
                <div className="mb-1 text-xs font-semibold text-black/60">
                  Name (TR)
                </div>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#845ec2]/45"
                  placeholder="Örn: Merkez Depo"
                  disabled={saving}
                />
              </div>

              <label className="sm:col-span-2 mt-1 inline-flex items-center gap-2 text-sm text-black/70">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, isActive: e.target.checked }))
                  }
                  className="h-4 w-4"
                  disabled={saving}
                />
                Aktif
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
                disabled={saving}
              >
                İptal
              </button>

              <button
                onClick={save}
                disabled={!canSave}
                className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:border-[#845ec2]/45 hover:bg-[#fbeaff]/60 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
