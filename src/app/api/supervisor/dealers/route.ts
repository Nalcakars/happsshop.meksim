import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  const { apiBase, error: e1 } = requireApiBase();
  if (e1) return e1;

  const { token, error: e2 } = await requireToken();
  if (e2) return e2;

  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const r = await fetch(
    `${apiBase}/api/supervisor/dealers${qs ? `?${qs}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}

export async function POST(req: NextRequest) {
  const { apiBase, error: e1 } = requireApiBase();
  if (e1) return e1;

  const { token, error: e2 } = await requireToken();
  if (e2) return e2;

  const body = await req.text();

  const r = await fetch(`${apiBase}/api/supervisor/dealers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const raw = await r.text();
  return proxy(raw, r.status, r.headers.get("content-type"));
}
