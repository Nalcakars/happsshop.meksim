import { NextResponse } from "next/server";
import { apiBaseOrThrow, forward, withQuery } from "@/app/api/_utils/forward";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const apiBase = apiBaseOrThrow();
    const { id } = await ctx.params;
    return forward(req, `${apiBase}/api/supervisor/products/${id}/images`);
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const apiBase = apiBaseOrThrow();
    const { id } = await ctx.params;

    // multipart: body arrayBuffer (boundary korunacak)
    const body = await req.arrayBuffer();

    return forward(
      req,
      `${apiBase}/api/supervisor/products/${id}/images${withQuery(req)}`,
      {
        method: "POST",
        body,
        preserveIncomingContentType: true,
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
