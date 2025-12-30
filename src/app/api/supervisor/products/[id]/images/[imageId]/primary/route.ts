import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

type Params = { id: string; imageId: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id, imageId } = await params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const r = await fetch(
    `${apiBase}/api/supervisor/products/${id}/images/${imageId}/primary`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
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
