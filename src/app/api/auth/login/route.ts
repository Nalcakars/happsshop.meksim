import { NextResponse } from "next/server";
import { z } from "zod";
import { setAuthCookies } from "@/lib/auth/session";
import type { LoginResponse } from "@/lib/auth/types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const apiBase = process.env.API_BASE_URL;

  try {
    if (!apiBase) {
      console.error("API_BASE_URL missing");
      return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Geçersiz form." }, { status: 400 });
    }

    const url = `${apiBase}/api/auth/login`;
    console.log("Proxy login ->", url);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        password: parsed.data.password,
      }),
    });

    const contentType = r.headers.get("content-type") || "";
    const raw = await r.text(); // <-- en güvenlisi (json parse etmeyiz)
    console.log("API status:", r.status, "content-type:", contentType);
    console.log("API raw body:", raw);

    let data: any = null;
    if (contentType.includes("application/json") && raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        // JSON değilse data null kalsın
      }
    }

    if (!r.ok) {
      return NextResponse.json(
        { message: data?.message ?? raw ?? "Giriş başarısız." },
        { status: r.status }
      );
    }

    const res = data as LoginResponse;

    if (!res?.accessToken || !res?.refreshToken) {
      console.error("Unexpected login response shape:", data);
      return NextResponse.json(
        { message: "API beklenmeyen cevap döndü." },
        { status: 500 }
      );
    }

    await setAuthCookies({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      accessTokenExpiresAt: res.accessTokenExpiresAt,
      refreshTokenExpiresAt: res.refreshTokenExpiresAt,
    });

    return NextResponse.json(
      {
        accountID: res.accountID,
        accountName: res.accountName,
        email: res.email,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("LOGIN ROUTE ERROR:", err);
    return NextResponse.json(
      { message: `Sunucu hatası (proxy). API_BASE_URL=${apiBase ?? "null"}` },
      { status: 500 }
    );
  }
}
