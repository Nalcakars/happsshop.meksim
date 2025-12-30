import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, imageId } = await ctx.params;

  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // ✅ Varsayım: API: DELETE /api/supervisor/products/{id}/images/{imageId}
  const r = await fetch(
    `${apiBase}/api/supervisor/products/${id}/images/${imageId}`,
    {
      method: "DELETE",
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
