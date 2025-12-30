import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export const runtime = "nodejs";

function proxy(raw: string, status: number, ct: string | null) {
  return new NextResponse(raw, {
    status,
    headers: { "content-type": ct ?? "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const r = await fetch(
    `${apiBase}/api/supervisor/customers/check-email${qs ? `?${qs}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}
