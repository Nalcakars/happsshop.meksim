import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function proxy(raw: string, status: number, ct: string | null) {
  return new NextResponse(raw, {
    status,
    headers: { "content-type": ct ?? "application/json" },
  });
}

function requireApiBase() {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return {
      error: NextResponse.json(
        { message: "API_BASE_URL yok." },
        { status: 500 }
      ),
    };
  }
  return { apiBase };
}

async function requireToken() {
  const token = await getAccessToken();
  if (!token) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { token };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { apiBase, error: e1 } = requireApiBase();
  if (e1) return e1;

  const { token, error: e2 } = await requireToken();
  if (e2) return e2;

  const r = await fetch(`${apiBase}/api/supervisor/dealers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { apiBase, error: e1 } = requireApiBase();
  if (e1) return e1;

  const { token, error: e2 } = await requireToken();
  if (e2) return e2;

  const body = await req.text();

  const r = await fetch(`${apiBase}/api/supervisor/dealers/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { apiBase, error: e1 } = requireApiBase();
  if (e1) return e1;

  const { token, error: e2 } = await requireToken();
  if (e2) return e2;

  const r = await fetch(`${apiBase}/api/supervisor/dealers/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}
