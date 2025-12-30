import { NextResponse } from "next/server";
import { getAccessToken, clearAuthCookies } from "@/lib/auth/session";

export async function POST() {
  const apiBase = process.env.API_BASE_URL;

  try {
    if (!apiBase) {
      await clearAuthCookies();
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const at = await getAccessToken();

    // API logout authorize istiyor → access token varsa gönder
    if (at) {
      await fetch(`${apiBase}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${at}`,
        },
      }).catch(() => null);
    }

    await clearAuthCookies();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Her durumda cookie temizle (kullanıcı çıkış yaptı say)
    await clearAuthCookies();
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
