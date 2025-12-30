import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function proxy(raw: string, status: number, ct: string | null) {
  return new NextResponse(raw, {
    status,
    headers: { "content-type": ct ?? "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const body = await req.text();

  // ✅ senin backend yolu
  const r = await fetch(`${apiBase}/api/public/partner/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}
