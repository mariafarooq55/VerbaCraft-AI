import {
  curateMediaAndReferences,
  generateFullArticleDraft,
  generateGuidedQuestions,
  generateStructureAndFaqs,
  humanizeArticleDraft,
} from "./llm-provider";
import { analyzeArticleContent } from "./nlp-analyzer";
import { listArticles, saveArticle, storageInfo } from "./article-store";

let seedPromise: Promise<void> | null = null;

export async function ensureSeedArticles(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const storage = await storageInfo();
      if (storage.mode !== "database") return;
      const existing = await listArticles();
      if (existing.length > 0) return;

      const presets = [
        {
          topic: "Agentic AI Workflows in Enterprise Product Engineering",
          fixedTitle:
            "Beyond the Hype: A Practical Blueprint for Agentic AI Workflows in 2026",
          category: "Artificial Intelligence & Engineering",
          audience: "Engineering Leaders & Product Architects",
          tone: "Authoritative & Analytical",
          purpose: "Thought Leadership & Playbook",
          targetWordCount: 1100,
          aiKeywords: [
            "agentic ai workflows",
            "human-in-the-loop governance",
            "engineering productivity",
            "evaluation pipelines",
          ],
          userKeywords: ["telemetry guardrails", "production reliability"],
          humanizationStyle: "Executive Authority",
        },
        {
          topic: "AI-Assisted Grid Optimization for Renewable Microgrids",
          fixedTitle:
            "Designing Resilient Renewable Microgrids: Lessons from Field Deployments and Research",
          category: "Clean Energy & Sustainability",
          audience: "Climate Tech Operators & Policy Analysts",
          tone: "Investigative & Clear",
          purpose: "Research Synthesis & Guide",
          targetWordCount: 1050,
          aiKeywords: [
            "renewable microgrids",
            "grid load forecasting",
            "distributed solar storage",
            "clean energy telemetry",
          ],
          userKeywords: ["battery dispatch", "community resilience"],
          humanizationStyle: "Natural Editorial",
        },
      ];

      for (const item of presets) {
        const questions = await generateGuidedQuestions(
          item.topic,
          item.fixedTitle
        );
        questions[0].answer = `Teams deploy ${item.aiKeywords[0]} rapidly without establishing baseline telemetry or clear human review checkpoints.`;
        questions[1].answer = `Sustainable gains come from pairing automated orchestration with explicit human quality gates.`;

        const allKws = [...item.aiKeywords, ...item.userKeywords];
        const guidedAnswers = Object.fromEntries(
          questions.map((q) => [q.question, q.answer])
        );

        const { outline, faqs } = await generateStructureAndFaqs({
          topic: item.topic,
          fixedTitle: item.fixedTitle,
          category: item.category,
          audience: item.audience,
          tone: item.tone,
          targetWordCount: item.targetWordCount,
          purpose: item.purpose,
          keywords: allKws,
          guidedAnswers,
        });

        const media = curateMediaAndReferences({
          topic: item.topic,
          category: item.category,
        });

        const selectedImages = media.images.filter((i) => i.selected);
        const selectedVideos = media.videos.filter((v) => v.selected);
        const selectedLinks = media.links.filter((l) => l.selected);

        const { draft } = await generateFullArticleDraft({
          topic: item.topic,
          fixedTitle: item.fixedTitle,
          category: item.category,
          audience: item.audience,
          tone: item.tone,
          targetWordCount: item.targetWordCount,
          purpose: item.purpose,
          guidedQuestions: questions,
          keywords: allKws,
          outline,
          faqs,
          selectedImages,
          selectedVideos,
          selectedLinks,
        });

        const beforeAnalysis = analyzeArticleContent(draft, allKws);
        const { humanized } = await humanizeArticleDraft({
          draft,
          fixedTitle: item.fixedTitle,
          style: item.humanizationStyle,
          intensity: "balanced",
          audience: item.audience,
        });
        const afterAnalysis = analyzeArticleContent(humanized, allKws);

        const slug = item.fixedTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);

        await saveArticle({
          slug,
          topic: item.topic,
          fixedTitle: item.fixedTitle,
          category: item.category,
          audience: item.audience,
          tone: item.tone,
          purpose: item.purpose,
          targetWordCount: item.targetWordCount,
          guidedAnswers,
          aiKeywords: item.aiKeywords,
          userKeywords: item.userKeywords,
          outline,
          faqs,
          selectedImages,
          selectedVideos,
          selectedLinks,
          rawDraft: draft,
          humanizedDraft: humanized,
          finalContent: humanized,
          beforeAnalysis,
          afterAnalysis,
          humanizationStyle: item.humanizationStyle,
          storageBackend: "Saved in this app",
        });
      }
    } catch (err) {
      console.error("Seed articles warning:", err);
    }
  })();

  return seedPromise;
}
