import { NextResponse } from "next/server";
import { storageInfo } from "@/lib/article-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storage = await storageInfo();
    return Response.json({
      ok: true,
      storage,
    });
  } catch {
    return Response.json({ ok: true, storage: { mode: "file" } });
  }
}
