import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export const runtime = "nodejs";

// ✅ Next 16.1: params Promise olabiliyor → await edeceğiz
type Ctx = { params: Promise<{ id: string }> };

function jsonProxy(raw: string, status: number, contentType: string | null) {
  return new NextResponse(raw, {
    status,
    headers: { "content-type": contentType ?? "application/json" },
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const r = await fetch(
    `${apiBase}/api/supervisor/products/${id}/images${qs ? `?${qs}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const raw = await r.text();
  return jsonProxy(raw, r.status, r.headers.get("content-type"));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ✅ Query'yi al (makePrimary=true/false)
  const url = new URL(req.url);
  const makePrimary = url.searchParams.get("makePrimary"); // "true" | "false" | null
  const qs =
    makePrimary !== null
      ? `?makePrimary=${encodeURIComponent(makePrimary)}`
      : "";

  // ✅ Frontend'den gelen form
  const incoming = await req.formData();

  // 🔥 BACKEND IFormFile file BEKLİYOR: key 'file' olmalı
  // Senin UI tarafında şu an "files" gönderiyorsun → onu da burada yakalayalım.
  let file = incoming.get("file");

  // Eğer frontend yanlışlıkla files gönderiyorsa (mevcut kodunda öyle)
  if (!file) {
    const maybe = incoming.get("files");
    if (maybe) file = maybe;
  }

  if (!file) {
    return NextResponse.json(
      {
        message:
          "Dosya gelmedi. FormData key 'file' olmalı (veya geçici olarak 'files' yakalandı).",
        incomingKeys: Array.from(incoming.keys()),
      },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        message:
          "Dosya File değil. FormData append ile gerçek File gönderilmeli.",
        incomingKeys: Array.from(incoming.keys()),
      },
      { status: 400 }
    );
  }

  // ✅ Backend'e temiz form oluştur
  const out = new FormData();
  out.append("file", file, file.name);

  // (İleride ek alanlar taşınsın diye)
  for (const [k, v] of incoming.entries()) {
    if (k === "file" || k === "files") continue; // ikisini de dışarıda bırak
    out.append(k, v);
  }

  const r = await fetch(
    `${apiBase}/api/supervisor/products/${id}/images${qs}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // ⚠️ Content-Type EKLEME (boundary bozulur)
      },
      body: out,
    }
  );

  const raw = await r.text();
  return jsonProxy(raw, r.status, r.headers.get("content-type"));
}
