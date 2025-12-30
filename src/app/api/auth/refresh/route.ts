import { NextResponse } from "next/server";
import { getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/session";
import type { LoginResponse } from "@/lib/auth/types";

export async function POST() {
  const apiBase = process.env.API_BASE_URL;

  try {
    if (!apiBase) {
      return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({ message: "Refresh token yok." }, { status: 401 });
    }

    const r = await fetch(`${apiBase}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: data?.message ?? "Refresh başarısız." },
        { status: r.status }
      );
    }

    const res = data as LoginResponse;

    await setAuthCookies({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      accessTokenExpiresAt: res.accessTokenExpiresAt,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt,
    });

    // ✅ önemli: yeni access token'ı da dön
    return NextResponse.json(
      {
        ok: true,
        accessToken: res.accessToken,
        accessTokenExpiresAt: res.accessTokenExpiresAt,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: "Sunucu hatası." }, { status: 500 });
  }
}
