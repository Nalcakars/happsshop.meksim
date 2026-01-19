import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export async function POST(req: Request) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // multipart/form-data (file) forward
  const formData = await req.formData();

  const r = await fetch(`${apiBase}/api/supervisor/imports/prices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Content-Type set etmiyoruz! fetch boundary’yi kendi koysun
    },
    body: formData,
  });

  const raw = await r.text();
  return new NextResponse(raw, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
