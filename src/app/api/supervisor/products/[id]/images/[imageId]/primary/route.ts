import { NextResponse } from "next/server";
import { apiBaseOrThrow, forward } from "@/app/api/_utils/forward";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const apiBase = apiBaseOrThrow();
    const { id, imageId } = await ctx.params;

    return forward(
      req,
      `${apiBase}/api/supervisor/products/${id}/images/${imageId}/primary`,
      {
        method: "PUT",
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
