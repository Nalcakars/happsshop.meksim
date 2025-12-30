import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function proxy(raw: string, status: number, ct: string | null) {
  return new NextResponse(raw, {
    status,
    headers: { "content-type": ct ?? "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token.trim()) {
    return NextResponse.json({ message: "Token zorunlu." }, { status: 400 });
  }

  const r = await fetch(
    `${apiBase}/api/public/partner/verify?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}
