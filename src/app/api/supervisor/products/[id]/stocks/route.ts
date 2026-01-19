import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const r = await fetch(
    `${apiBase}/api/supervisor/products/${id}/stocks${qs ? `?${qs}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const raw = await r.text();
  return new NextResponse(raw, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.text();

  const r = await fetch(`${apiBase}/api/supervisor/products/${id}/stocks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const raw = await r.text();
  return new NextResponse(raw, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
