import { NextResponse } from "next/server";
import { saveArticle, listArticles, storageInfo } from "@/lib/article-store";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to see your articles." }, { status: 401 });
  }

  try {
    const [articleRows, storage] = await Promise.all([
      listArticles(user.id),
      storageInfo(),
    ]);
    return NextResponse.json({ articles: articleRows, storage });
  } catch (err) {
    console.error("GET /api/articles failed:", err);
    return NextResponse.json(
      {
        articles: [],
        storage: {
          mode: "file",
          label: "This computer",
          note: "Articles are saved locally.",
        },
        error: "Could not load your saved articles. Please try again.",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to save your article." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fixedTitle = String(body.fixedTitle || "").trim();
    const finalContent = String(
      body.finalContent || body.humanizedDraft || body.rawDraft || ""
    ).trim();

    if (!fixedTitle || !finalContent) {
      return NextResponse.json(
        { error: "Please add a title and some article text before saving." },
        { status: 400 }
      );
    }

    const { article, mode } = await saveArticle({
      id: body.id,
      userId: user.id,
      topic: String(body.topic || fixedTitle),
      fixedTitle,
      category: String(body.category || "General"),
      audience: String(body.audience || "General readers"),
      tone: String(body.tone || "Natural"),
      purpose: String(body.purpose || "Article"),
      targetWordCount: Number(body.targetWordCount) || 1200,
      guidedAnswers:
        body.guidedAnswers && typeof body.guidedAnswers === "object"
          ? body.guidedAnswers
          : {},
      aiKeywords: Array.isArray(body.aiKeywords) ? body.aiKeywords : [],
      userKeywords: Array.isArray(body.userKeywords) ? body.userKeywords : [],
      outline: Array.isArray(body.outline) ? body.outline : [],
      faqs: Array.isArray(body.faqs) ? body.faqs : [],
      selectedImages: Array.isArray(body.selectedImages) ? body.selectedImages : [],
      selectedVideos: Array.isArray(body.selectedVideos) ? body.selectedVideos : [],
      selectedLinks: Array.isArray(body.selectedLinks) ? body.selectedLinks : [],
      rawDraft: String(body.rawDraft || finalContent),
      humanizedDraft: String(body.humanizedDraft || finalContent),
      finalContent,
      beforeAnalysis: body.beforeAnalysis ?? null,
      afterAnalysis: body.afterAnalysis ?? null,
      humanizationStyle: String(body.humanizationStyle || "Natural Editorial"),
    });

    return NextResponse.json({ article, mode }, { status: mode === "created" ? 201 : 200 });
  } catch (err) {
    console.error("POST /api/articles failed:", err);
    return NextResponse.json(
      { error: "Could not save your article. Please try again." },
      { status: 500 }
    );
  }
}
