import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export function apiBaseOrThrow() {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) throw new Error("API_BASE_URL yok.");
  return apiBase;
}

/**
 * Next.js route -> Backend API forward helper
 * - Adds Authorization Bearer token from session
 * - Preserves incoming Content-Type (important for multipart boundary)
 * - Returns raw body + status + content-type
 */
export async function forward(
  req: Request,
  url: string,
  init?: RequestInit & { preserveIncomingContentType?: boolean }
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const headers = new Headers(init?.headers ?? undefined);

  // Content-Type: JSON veya multipart boundary bozulmasın
  const preserve = init?.preserveIncomingContentType ?? true;
  if (preserve) {
    const ct = req.headers.get("content-type");
    if (ct && !headers.has("content-type")) headers.set("content-type", ct);
  }

  headers.set("Authorization", `Bearer ${token}`);

  const r = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const raw = await r.text();
  return new NextResponse(raw, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}

export function withQuery(req: Request) {
  const u = new URL(req.url);
  const qs = u.searchParams.toString();
  return qs ? `?${qs}` : "";
}
