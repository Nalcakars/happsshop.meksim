import { NextResponse } from "next/server";
import { apiBaseOrThrow, forward } from "@/app/api/_utils/forward";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const apiBase = apiBaseOrThrow();
    const { id } = await ctx.params;

    const body = await req.text();

    return forward(
      req,
      `${apiBase}/api/supervisor/products/${id}/images/sort`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        preserveIncomingContentType: false,
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
