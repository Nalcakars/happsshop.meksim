import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

export async function GET() {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase)
    return NextResponse.json({ message: "API_BASE_URL yok." }, { status: 500 });

  const token = await getAccessToken();
  if (!token)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const r = await fetch(`${apiBase}/api/supervisor/exports/prices`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const buf = await r.arrayBuffer();

  const contentType =
    r.headers.get("content-type") ??
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const contentDisposition =
    r.headers.get("content-disposition") ??
    'attachment; filename="PricesExport.xlsx"';

  return new NextResponse(buf, {
    status: r.status,
    headers: {
      "content-type": contentType,
      "content-disposition": contentDisposition,
    },
  });
}
