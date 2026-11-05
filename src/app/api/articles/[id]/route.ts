import { NextResponse } from "next/server";
import { deleteArticle, getArticle } from "@/lib/article-store";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "This link is not valid" }, { status: 400 });
    }

    const article = await getArticle(id, user.id);
    if (!article) {
      return NextResponse.json({ error: "We could not find that article." }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (err) {
    console.error("GET /api/articles/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not open that article. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "This link is not valid" }, { status: 400 });
    }

    const deleted = await deleteArticle(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "We could not find that article." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("DELETE /api/articles/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not delete that article. Please try again." },
      { status: 500 }
    );
  }
}
