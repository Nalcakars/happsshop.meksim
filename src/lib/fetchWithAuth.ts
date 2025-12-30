import { getAccessToken } from "@/lib/auth/session";

type FetchWithAuthOptions = RequestInit & {
  /**
   * 🔁 401 olursa refresh denensin mi?
   * - SERVER: false
   * - CLIENT: true
   */
  retryOn401?: boolean;
};

type RefreshResponse =
  | { ok: true; accessToken: string; accessTokenExpiresAt?: string }
  | { ok?: false; message?: string };

export async function fetchWithAuth(
  input: string,
  init: FetchWithAuthOptions = {}
) {
  const token = await getAccessToken();

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });

  // 🔴 Server-safe default: refresh YOK
  if (res.status !== 401 || init.retryOn401 !== true) {
    return res;
  }

  // ⬇️ BURASI SADECE client-side retry içindir
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  const refreshRes = await fetch(`${siteUrl}/api/auth/refresh`, {
    method: "POST",
    cache: "no-store",
  });

  if (!refreshRes.ok) return res;

  const refreshData = (await refreshRes
    .json()
    .catch(() => null)) as RefreshResponse | null;

  const newAccessToken =
    refreshData && "accessToken" in refreshData
      ? refreshData.accessToken
      : null;

  if (!newAccessToken) return res;

  const headers2 = new Headers(init.headers);
  headers2.set("Authorization", `Bearer ${newAccessToken}`);

  // ✅ Aynı isteği yeni token ile tekrar dene
  return fetch(input, { ...init, headers: headers2 });
}
