import { NextResponse } from "next/server";
import {
  curateMediaAndReferences,
  generateFullArticleDraft,
  generateGuidedQuestions,
  generateKeywordSuggestions,
  generateStructureAndFaqs,
  generateTitleCandidates,
  getActiveLlmConfig,
  humanizeArticleDraft,
} from "@/lib/llm-provider";
import { analyzeArticleContent } from "@/lib/nlp-analyzer";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getActiveLlmConfig();
  return NextResponse.json({
    ok: true,
    llmProvider: cfg.provider,
    model: cfg.model,
  });
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json(
      { error: "Please sign in to start writing an article." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "generate_titles") {
      const topic = String(body.topic || "").trim();
      if (!topic || topic.length < 3) {
        return NextResponse.json(
          { error: "Please enter a topic or article idea (at least 3 characters)." },
          { status: 400 }
        );
      }
      const { titles, provider } = await generateTitleCandidates(topic);
      return NextResponse.json({ titles, provider });
    }

    if (action === "generate_questions") {
      const topic = String(body.topic || "").trim();
      const fixedTitle = String(body.fixedTitle || "").trim();
      if (!fixedTitle) {
        return NextResponse.json(
          { error: "Please choose a title in step 1 first." },
          { status: 400 }
        );
      }
      const questions = await generateGuidedQuestions(topic || fixedTitle, fixedTitle);
      return NextResponse.json({ questions });
    }

    if (action === "generate_keywords") {
      const topic = String(body.topic || "").trim();
      const fixedTitle = String(body.fixedTitle || "").trim();
      const category = String(body.category || "Technology & Innovation");
      const audience = String(body.audience || "General Professionals");
      const keywords = await generateKeywordSuggestions({
        topic: topic || fixedTitle,
        fixedTitle,
        category,
        audience,
      });
      return NextResponse.json({ keywords });
    }

    if (action === "generate_structure") {
      const topic = String(body.topic || "").trim();
      const fixedTitle = String(body.fixedTitle || "").trim();
      const category = String(body.category || "Technology & Innovation");
      const audience = String(body.audience || "Practitioners & Leaders");
      const tone = String(body.tone || "Authoritative & Clear");
      const targetWordCount = Number(body.targetWordCount) || 1200;
      const purpose = String(body.purpose || "Educational Deep Dive");
      const keywords = Array.isArray(body.keywords)
        ? body.keywords.map(String)
        : [];
      const guidedAnswers =
        body.guidedAnswers && typeof body.guidedAnswers === "object"
          ? (body.guidedAnswers as Record<string, string>)
          : {};

      const [{ outline, faqs }, media] = await Promise.all([
        generateStructureAndFaqs({
          topic: topic || fixedTitle,
          fixedTitle,
          category,
          audience,
          tone,
          targetWordCount,
          purpose,
          keywords,
          guidedAnswers,
        }),
        Promise.resolve(
          curateMediaAndReferences({
            topic: topic || fixedTitle,
            category,
          })
        ),
      ]);

      return NextResponse.json({
        outline,
        faqs,
        images: media.images,
        videos: media.videos,
        links: media.links,
      });
    }

    if (action === "generate_article") {
      const fixedTitle = String(body.fixedTitle || "").trim();
      if (!fixedTitle) {
        return NextResponse.json(
          { error: "Please choose a title in step 1 first." },
          { status: 400 }
        );
      }
      const keywords = Array.isArray(body.keywords)
        ? body.keywords.map(String)
        : [];

      const { draft, provider } = await generateFullArticleDraft({
        topic: String(body.topic || fixedTitle),
        fixedTitle,
        category: String(body.category || "Technology & Strategy"),
        audience: String(body.audience || "Industry Professionals"),
        tone: String(body.tone || "Authoritative & Engaging"),
        targetWordCount: Number(body.targetWordCount) || 1200,
        purpose: String(body.purpose || "Thought Leadership"),
        guidedQuestions: Array.isArray(body.guidedQuestions)
          ? body.guidedQuestions
          : [],
        keywords,
        outline: Array.isArray(body.outline) ? body.outline : [],
        faqs: Array.isArray(body.faqs) ? body.faqs : [],
        selectedImages: Array.isArray(body.selectedImages)
          ? body.selectedImages
          : [],
        selectedVideos: Array.isArray(body.selectedVideos)
          ? body.selectedVideos
          : [],
        selectedLinks: Array.isArray(body.selectedLinks)
          ? body.selectedLinks
          : [],
      });

      const analysis = analyzeArticleContent(draft, keywords);
      return NextResponse.json({ draft, analysis, provider });
    }

    if (action === "analyze_article") {
      const content = String(body.content || "");
      const keywords = Array.isArray(body.keywords)
        ? body.keywords.map(String)
        : [];
      const analysis = analyzeArticleContent(content, keywords);
      return NextResponse.json({ analysis });
    }

    if (action === "humanize_article") {
      const draft = String(body.draft || "");
      const fixedTitle = String(body.fixedTitle || "Untitled Article");
      if (!draft.trim()) {
        return NextResponse.json(
          { error: "Write your first draft before asking for a rewrite." },
          { status: 400 }
        );
      }
      const style = String(body.style || "Natural Editorial");
      const intensity =
        body.intensity === "light" || body.intensity === "deep"
          ? body.intensity
          : "balanced";
      const audience = String(body.audience || "General Readers");
      const keywords = Array.isArray(body.keywords)
        ? body.keywords.map(String)
        : [];

      const beforeAnalysis = analyzeArticleContent(draft, keywords);
      const { humanized, provider, changesSummary } = await humanizeArticleDraft({
        draft,
        fixedTitle,
        style,
        intensity,
        audience,
      });
      const afterAnalysis = analyzeArticleContent(humanized, keywords);

      return NextResponse.json({
        humanized,
        beforeAnalysis,
        afterAnalysis,
        provider,
        changesSummary,
      });
    }

    return NextResponse.json(
      { error: `Unsupported workflow action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("Workflow API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Something went wrong while creating your article. Please try again.",
      },
      { status: 500 }
    );
  }
}
