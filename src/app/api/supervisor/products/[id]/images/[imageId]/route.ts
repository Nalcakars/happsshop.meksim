import { NextResponse } from "next/server";
import { apiBaseOrThrow, forward } from "@/app/api/_utils/forward";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const apiBase = apiBaseOrThrow();
    const { id, imageId } = await ctx.params;

    return forward(
      req,
      `${apiBase}/api/supervisor/products/${id}/images/${imageId}`,
      {
        method: "DELETE",
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
