import { NextResponse } from "next/server";
import {
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/session";

async function ensureAccessToken() {
  const at = await getAccessToken();
  if (at) return at;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) return null;

  const rt = await getRefreshToken();
  if (!rt) return null;

  const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
    cache: "no-store",
  });

  const data = await refreshRes.json().catch(() => null);

  if (!refreshRes.ok || !data?.accessToken || !data?.refreshToken) {
    await clearAuthCookies();
    return null;
  }

  await setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });

  return data.accessToken as string;
}

export async function GET(req: Request) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = await ensureAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // query forward
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") ?? "tr";
  const page = url.searchParams.get("page") ?? "1";
  const pageSize = url.searchParams.get("pageSize") ?? "20";
  const q = url.searchParams.get("q") ?? "";
  const onlyActive = url.searchParams.get("onlyActive"); // "true" | "false" | null

  const target =
    `${apiBase}/api/supervisor/categories` +
    `?lang=${encodeURIComponent(lang)}` +
    `&page=${encodeURIComponent(page)}` +
    `&pageSize=${encodeURIComponent(pageSize)}` +
    `&q=${encodeURIComponent(q)}` +
    (onlyActive ? `&onlyActive=${encodeURIComponent(onlyActive)}` : "");

  const r = await fetch(target, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const raw = await r.text();
  return new NextResponse(raw, {
    status: r.status,
    headers: {
      "Content-Type": r.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(req: Request) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = await ensureAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.text();

  const r = await fetch(`${apiBase}/api/supervisor/categories`, {
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
      "Content-Type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
