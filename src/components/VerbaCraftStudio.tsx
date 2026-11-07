"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Bold,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Download,
  Edit3,
  Eye,
  Feather,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Layers,
  Link2,
  List,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Unlock,
  Video,
  Wand2,
  X,
} from "lucide-react";
import type {
  ArticleAnalysis,
  ArticleRecord,
  StudioSessionState,
} from "@/types/article";
import type { PublicUser } from "@/lib/auth-store";
import {
  downloadArticleToPc,
  type ExportFormat,
} from "@/lib/client-download";
import { ThemeToggle } from "./ThemeProvider";
import { ExportToolbar } from "./ExportToolbar";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { MarkdownPreview } from "./MarkdownPreview";
import { ArticleHistoryVault } from "./ArticleHistoryVault";

const SESSION_STORAGE_KEY = "verbacraft_studio_session_v1";

const SAMPLE_TOPICS = [
  "Agentic AI Workflows in Enterprise Software Teams",
  "Designing Resilient Urban Solar Microgrids in 2026",
  "Preventive Digital Biomarkers in Modern Cardiology",
  "Zero-Trust API Governance for Fintech Platforms",
];

const CATEGORIES = [
  "Artificial Intelligence & Technology",
  "Business & Executive Strategy",
  "Clean Energy & Sustainability",
  "Healthcare & Life Sciences",
  "Finance, Economics & Fintech",
  "Software Engineering & Cloud",
  "Education, Culture & Research",
];

const TONES = [
  "Authoritative & Analytical",
  "Conversational & Accessible",
  "Investigative Journalism",
  "Executive Briefing",
  "Educational & Practical",
];

const PURPOSES = [
  "Thought Leadership & Playbook",
  "Definitive SEO Pillar Guide",
  "Empirical Research Synthesis",
  "Industry Case Breakdown",
  "Practitioner Tutorial",
];

const HUMANIZATION_STYLES = [
  {
    name: "Natural Editorial",
    desc: "Balanced magazine style with a natural rhythm.",
  },
  {
    name: "Conversational & Warm",
    desc: "Friendly and easy to read, like talking to a real person.",
  },
  {
    name: "Executive Authority",
    desc: "Short and confident, for busy decision makers.",
  },
  {
    name: "Investigative Journalism",
    desc: "Story-driven and evidence-first, like a good feature article.",
  },
];

const WORKFLOW_STEPS = [
  { id: 1, short: "Choose your title", subtitle: "Start with any idea" },
  {
    id: 2,
    short: "Answer a few questions",
    subtitle: "Who reads it & how it sounds",
  },
  { id: 3, short: "Pick key phrases", subtitle: "Words people search for" },
  { id: 4, short: "Check the outline", subtitle: "Sections & common questions" },
  { id: 5, short: "Add pictures & links", subtitle: "Photos, videos, sources" },
  { id: 6, short: "Write the first draft", subtitle: "Instant quality check" },
  { id: 7, short: "Make it sound human", subtitle: "See the before & after" },
  { id: 8, short: "Edit, save & download", subtitle: "PDF, Word, HTML or text" },
];

const INITIAL_SESSION: StudioSessionState = {
  currentStep: 1,
  topic: "",
  titleCandidates: [],
  fixedTitle: "",
  isTitleLocked: false,
  guidedQuestions: [],
  category: CATEGORIES[0],
  audience: "Engineering Leaders, Product Managers & Practitioners",
  tone: TONES[0],
  targetWordCount: 1200,
  purpose: PURPOSES[0],
  aiKeywords: [],
  selectedAiKeywords: [],
  userKeywords: [],
  outline: [],
  faqs: [],
  images: [],
  videos: [],
  links: [],
  rawDraft: "",
  humanizedDraft: "",
  finalContent: "",
  humanizationStyle: "Natural Editorial",
  humanizationIntensity: "balanced",
  beforeAnalysis: null,
  afterAnalysis: null,
  liveAnalysis: null,
  savedArticleId: null,
};

export function VerbaCraftStudio({
  currentUser,
}: {
  currentUser: PublicUser;
}) {
  const sessionStorageKey = `${SESSION_STORAGE_KEY}_${currentUser.id}`;
  const [activeWorkspace, setActiveWorkspace] = useState<
    "studio" | "history"
  >("studio");
  const [session, setSession] = useState<StudioSessionState>(INITIAL_SESSION);
  const [hydrated, setHydrated] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headerExportOpen, setHeaderExportOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const headerExportRef = useRef<HTMLDivElement | null>(null);

  // Inputs for dynamic additions
  const [customTitleDraft, setCustomTitleDraft] = useState("");
  const [customKeywordInput, setCustomKeywordInput] = useState("");
  const [newHeadingInput, setNewHeadingInput] = useState("");
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageCaption, setCustomImageCaption] = useState("");
  const [customRefTitle, setCustomRefTitle] = useState("");
  const [customRefUrl, setCustomRefUrl] = useState("");

  // Editor & Diff view tabs
  const [step8Tab, setStep8Tab] = useState<"split" | "editor" | "preview">(
    "split"
  );
  const [diffMode, setDiffMode] = useState<"side-by-side" | "humanized">(
    "side-by-side"
  );

  // Status, loading, and history
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<string>("Ready");
  const [historyArticles, setHistoryArticles] = useState<ArticleRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [storage, setStorage] = useState<{
    label: string;
    note: string;
  } | null>(null);

  // Hydrate session state from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSession((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore storage read issues
    } finally {
      setHydrated(true);
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
    } catch {
      // Ignore quota errors
    }
  }, [session, hydrated, sessionStorageKey]);

  // Close header export dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        headerExportRef.current &&
        !headerExportRef.current.contains(e.target as Node)
      ) {
        setHeaderExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/articles");
      const data = await res.json();
      if (Array.isArray(data.articles)) {
        setHistoryArticles(data.articles);
      }
      if (data.storage?.label) {
        setStorage({
          label: String(data.storage.label),
          note: String(data.storage.note || ""),
        });
      }
    } catch {
      // Handled gracefully
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetch("/api/workflow")
      .then((r) => r.json())
      .then((d) => {
        if (d?.model) {
          setLlmStatus(
            d.llmProvider === "builtin"
              ? "Built-in writing assistant"
              : `Live LLM (${d.llmProvider}: ${d.model})`
          );
        }
      })
      .catch(() => {});
  }, [fetchHistory]);

  const notifySuccess = useCallback((msg: string) => {
    setErrorBanner(null);
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  const allSelectedKeywords = useMemo(
    () =>
      Array.from(
        new Set([...session.selectedAiKeywords, ...session.userKeywords])
      ),
    [session.selectedAiKeywords, session.userKeywords]
  );

  const selectedImages = useMemo(
    () => session.images.filter((i) => i.selected),
    [session.images]
  );
  const selectedVideos = useMemo(
    () => session.videos.filter((v) => v.selected),
    [session.videos]
  );
  const selectedLinks = useMemo(
    () => session.links.filter((l) => l.selected),
    [session.links]
  );

  const bestAvailableManuscript = useMemo(
    () => session.finalContent || session.humanizedDraft || session.rawDraft,
    [session.finalContent, session.humanizedDraft, session.rawDraft]
  );

  // --- Workflow API Handlers ---
  const handleGenerateTitles = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic ?? session.topic).trim();
    if (targetTopic.length < 3) {
      setErrorBanner("Please type your topic first (at least 3 characters).");
      return;
    }
    setErrorBanner(null);
    setBusyAction("Thinking of title ideas...");
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_titles", topic: targetTopic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate titles.");

      setSession((prev) => ({
        ...prev,
        topic: targetTopic,
        titleCandidates: data.titles || [],
      }));
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not suggest titles. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleLockTitle = async (chosenTitle: string) => {
    const clean = chosenTitle.trim();
    if (!clean) {
      setErrorBanner("Please pick a title, or type your own, before continuing.");
      return;
    }
    setErrorBanner(null);
    setBusyAction("Saving your title and preparing a few questions...");
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_questions",
          topic: session.topic || clean,
          fixedTitle: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate guided questions.");

      setSession((prev) => ({
        ...prev,
        fixedTitle: clean,
        isTitleLocked: true,
        guidedQuestions: data.questions || [],
        currentStep: 2,
      }));
      notifySuccess("Title locked in. Next, a few quick details about your article.");
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not save your title. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateKeywords = async () => {
    if (!session.fixedTitle) {
      setErrorBanner("Please choose and lock a title in Step 1 first.");
      return;
    }
    setErrorBanner(null);
    setBusyAction("Finding useful key phrases...");
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_keywords",
          topic: session.topic,
          fixedTitle: session.fixedTitle,
          category: session.category,
          audience: session.audience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Keyword generation failed.");

      const kws: string[] = data.keywords || [];
      setSession((prev) => ({
        ...prev,
        aiKeywords: kws,
        selectedAiKeywords:
          prev.selectedAiKeywords.length > 0
            ? prev.selectedAiKeywords
            : kws.slice(0, 6),
        currentStep: 3,
      }));
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not find key phrases. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateStructureAndAssets = async () => {
    setErrorBanner(null);
    setBusyAction(
      "Building your outline, questions, pictures and links..."
    );
    try {
      const guidedAnswers = Object.fromEntries(
        session.guidedQuestions.map((q) => [q.question, q.answer])
      );
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_structure",
          topic: session.topic,
          fixedTitle: session.fixedTitle,
          category: session.category,
          audience: session.audience,
          tone: session.tone,
          targetWordCount: session.targetWordCount,
          purpose: session.purpose,
          keywords: allSelectedKeywords,
          guidedAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate structure.");

      setSession((prev) => ({
        ...prev,
        outline: data.outline || [],
        faqs: data.faqs || [],
        images: data.images || [],
        videos: data.videos || [],
        links: data.links || [],
        currentStep: 4,
      }));
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not build the outline. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateFullArticle = async () => {
    if (!session.fixedTitle) {
      setErrorBanner("Please choose and lock a title in Step 1 first.");
      return;
    }
    setErrorBanner(null);
    setBusyAction(
      "Writing your article and running a quality check..."
    );
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_article",
          topic: session.topic,
          fixedTitle: session.fixedTitle,
          category: session.category,
          audience: session.audience,
          tone: session.tone,
          targetWordCount: session.targetWordCount,
          purpose: session.purpose,
          guidedQuestions: session.guidedQuestions,
          keywords: allSelectedKeywords,
          outline: session.outline,
          faqs: session.faqs,
          selectedImages,
          selectedVideos,
          selectedLinks,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Article generation failed.");

      setSession((prev) => ({
        ...prev,
        rawDraft: data.draft,
        finalContent: data.draft,
        beforeAnalysis: data.analysis,
        liveAnalysis: data.analysis,
        afterAnalysis: null,
        humanizedDraft: "",
        currentStep: 6,
      }));
      // Automatic save: the finished draft always lands in My articles.
      try {
        await persistToHistory({
          finalContent: data.draft,
          rawDraft: data.draft,
          humanizedDraft: "",
          beforeAnalysis: data.analysis,
          afterAnalysis: data.analysis,
        });
        notifySuccess(
          "Your first draft is ready and has been saved to My articles automatically."
        );
      } catch {
        notifySuccess(
          "Your first draft is ready. Use “Save to My articles” if you want a copy kept."
        );
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not write the article. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleHumanize = async () => {
    const sourceText = session.rawDraft || session.finalContent;
    if (!sourceText.trim()) {
      setErrorBanner("Please write your first draft in Step 6 before rewriting it.");
      return;
    }
    setErrorBanner(null);
    setBusyAction(
      `Rewriting your article in a ${session.humanizationStyle} style...`
    );
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "humanize_article",
          draft: sourceText,
          fixedTitle: session.fixedTitle,
          style: session.humanizationStyle,
          intensity: session.humanizationIntensity,
          audience: session.audience,
          keywords: allSelectedKeywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Humanization failed.");

      setSession((prev) => ({
        ...prev,
        humanizedDraft: data.humanized,
        finalContent: data.humanized,
        beforeAnalysis: data.beforeAnalysis,
        afterAnalysis: data.afterAnalysis,
        liveAnalysis: data.afterAnalysis,
        currentStep: 7,
      }));
      // Automatic save: the finished, human-sounding article goes straight to My articles.
      try {
        await persistToHistory({
          finalContent: data.humanized,
          rawDraft: sourceText,
          humanizedDraft: data.humanized,
          beforeAnalysis: data.beforeAnalysis,
          afterAnalysis: data.afterAnalysis,
          humanizationStyle: session.humanizationStyle,
        });
        notifySuccess(
          `Your article sounds much more human now (${data.beforeAnalysis.humanNaturalnessScore} → ${data.afterAnalysis.humanNaturalnessScore} out of 100) and it has been saved to My articles automatically.`
        );
      } catch {
        notifySuccess(
          `Your article sounds much more human now (${data.beforeAnalysis.humanNaturalnessScore} → ${data.afterAnalysis.humanNaturalnessScore} out of 100). Please press “Save to My articles” to keep a copy.`
        );
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not rewrite the article. Please try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefreshLiveAnalysis = async (contentToAnalyze?: string) => {
    const text = contentToAnalyze ?? session.finalContent;
    if (!text.trim()) return;
    try {
      const res = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_article",
          content: text,
          keywords: allSelectedKeywords,
        }),
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setSession((prev) => ({
          ...prev,
          liveAnalysis: data.analysis as ArticleAnalysis,
        }));
      }
    } catch {
      // Silent background score update
    }
  };

  /**
   * Saves (or updates) the article in "My articles".
   * Used both by the manual Save button and automatically the moment an
   * article draft or humanized version is finished, so nothing is ever lost.
   */
  const persistToHistory = async (overrides: {
    finalContent?: string;
    rawDraft?: string;
    humanizedDraft?: string;
    beforeAnalysis?: ArticleAnalysis | null;
    afterAnalysis?: ArticleAnalysis | null;
    humanizationStyle?: string;
  }): Promise<{ mode: string; title: string; id: string } | null> => {
    const contentToSave = (overrides.finalContent ?? bestAvailableManuscript).trim();
    if (!session.fixedTitle || !contentToSave) return null;

    const guidedAnswers = Object.fromEntries(
      session.guidedQuestions.map((q) => [q.question, q.answer])
    );
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: session.savedArticleId,
        topic: session.topic,
        fixedTitle: session.fixedTitle,
        category: session.category,
        audience: session.audience,
        tone: session.tone,
        purpose: session.purpose,
        targetWordCount: session.targetWordCount,
        guidedAnswers,
        aiKeywords: session.selectedAiKeywords,
        userKeywords: session.userKeywords,
        outline: session.outline,
        faqs: session.faqs,
        selectedImages,
        selectedVideos,
        selectedLinks,
        rawDraft: overrides.rawDraft ?? (session.rawDraft || contentToSave),
        humanizedDraft:
          overrides.humanizedDraft ?? (session.humanizedDraft || contentToSave),
        finalContent: contentToSave,
        beforeAnalysis: overrides.beforeAnalysis ?? session.beforeAnalysis,
        afterAnalysis:
          overrides.afterAnalysis ??
          session.liveAnalysis ??
          session.afterAnalysis,
        humanizationStyle:
          overrides.humanizationStyle ?? session.humanizationStyle,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save your article.");

    setSession((prev) => ({ ...prev, savedArticleId: data.article.id }));
    await fetchHistory();
    return {
      mode: String(data.mode),
      title: session.fixedTitle,
      id: data.article.id,
    };
  };

  const handleSaveToDatabase = async () => {
    if (!session.fixedTitle || !bestAvailableManuscript.trim()) {
      setErrorBanner(
        "Write or generate your article first, then you can save it to My articles."
      );
      return;
    }
    setErrorBanner(null);
    setBusyAction("Saving your article to My articles...");
    try {
      const result = await persistToHistory({});
      if (result) {
        notifySuccess(
          result.mode === "updated"
            ? `Updated "${result.title}" in My articles.`
            : `Saved "${result.title}" to My articles.`
        );
        if (result.id) {
          setSession((prev) => ({ ...prev, savedArticleId: result.id }));
        }
      }
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not save your article."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleQuickExportFormat = async (
    format: ExportFormat,
    customMarkdown?: string,
    customTitleSuffix?: string
  ) => {
    const md = (customMarkdown ?? bestAvailableManuscript).trim();
    if (!md) {
      setErrorBanner("Please write your article first, then you can download it.");
      return;
    }
    setHeaderExportOpen(false);
    try {
      const exportTitle = customTitleSuffix
        ? `${session.fixedTitle || "Article"} (${customTitleSuffix})`
        : session.fixedTitle || "Intelligent Article";
      const result = await downloadArticleToPc({
        format,
        title: exportTitle,
        category: session.category,
        audience: session.audience,
        tone: session.tone,
        markdown: md,
        wordCount: session.liveAnalysis?.wordCount,
        readabilityScore: session.liveAnalysis?.fleschReadingEase,
        naturalnessScore: session.liveAnalysis?.humanNaturalnessScore,
        selectedImages,
        selectedVideos,
        selectedLinks,
      });
      notifySuccess(`Downloading "${result.filename}" directly to your PC!`);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Could not export file."
      );
    }
  };

  const insertMarkdownAtCursor = (prefix: string, suffix = "") => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = session.finalContent;
    const selected = current.slice(start, end) || "text";
    const nextValue =
      current.slice(0, start) + prefix + selected + suffix + current.slice(end);
    setSession((prev) => ({ ...prev, finalContent: nextValue }));
    window.setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const handleLoadFromHistory = (art: ArticleRecord) => {
    const questions = Object.entries(art.guidedAnswers || {}).map(
      ([q, ans], idx) => ({
        id: `gq-restored-${idx}`,
        question: q,
        placeholder: "",
        helperText: "Restored from saved brief",
        answer: ans,
      })
    );

    setSession({
      currentStep: 8,
      topic: art.topic,
      titleCandidates: [],
      fixedTitle: art.fixedTitle,
      isTitleLocked: true,
      guidedQuestions: questions,
      category: art.category,
      audience: art.audience,
      tone: art.tone,
      targetWordCount: art.targetWordCount,
      purpose: art.purpose,
      aiKeywords: art.aiKeywords,
      selectedAiKeywords: art.aiKeywords,
      userKeywords: art.userKeywords,
      outline: art.outline,
      faqs: art.faqs,
      images: art.selectedImages.map((img) => ({ ...img, selected: true })),
      videos: art.selectedVideos.map((vid) => ({ ...vid, selected: true })),
      links: art.selectedLinks.map((lnk) => ({ ...lnk, selected: true })),
      rawDraft: art.rawDraft,
      humanizedDraft: art.humanizedDraft,
      finalContent: art.finalContent,
      humanizationStyle: art.humanizationStyle || "Natural Editorial",
      humanizationIntensity: "balanced",
      beforeAnalysis: art.beforeAnalysis,
      afterAnalysis: art.afterAnalysis,
      liveAnalysis: art.afterAnalysis,
      savedArticleId: art.id,
    });
    setActiveWorkspace("studio");
    notifySuccess(`Loaded "${art.fixedTitle}" into Editor & Export!`);
  };

  const handleDeleteFromHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryArticles((prev) => prev.filter((a) => a.id !== id));
        if (session.savedArticleId === id) {
          setSession((prev) => ({ ...prev, savedArticleId: null }));
        }
        notifySuccess("The article was removed from My articles.");
      }
    } catch {
      setErrorBanner("Could not delete the article. Please try again.");
    }
  };

  const handleResetSession = () => {
    sessionStorage.removeItem(sessionStorageKey);
    setSession(INITIAL_SESSION);
    setCustomTitleDraft("");
    setActiveWorkspace("studio");
    notifySuccess("Ready for a new article.");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem(sessionStorageKey);
      window.location.assign("/");
    }
  };

  const isStepCompleted = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return Boolean(session.fixedTitle && session.isTitleLocked);
      case 2:
        return Boolean(session.fixedTitle && session.category && session.audience);
      case 3:
        return allSelectedKeywords.length > 0;
      case 4:
        return session.outline.length > 0;
      case 5:
        return selectedImages.length > 0 || selectedLinks.length > 0;
      case 6:
        return Boolean(session.rawDraft);
      case 7:
        return Boolean(session.humanizedDraft);
      case 8:
        return Boolean(session.savedArticleId);
      default:
        return false;
    }
  };

  const completedStepsCount = WORKFLOW_STEPS.filter((s) =>
    isStepCompleted(s.id)
  ).length;
  const progressPercent = Math.max(
    12,
    Math.round((completedStepsCount / WORKFLOW_STEPS.length) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Global Studio Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#12141A]/95 backdrop-blur-md border-b border-[#E6E1D8] dark:border-[#242834] transition-colors">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-auto min-h-16 flex flex-wrap items-center justify-between gap-2.5 py-2">
          {/* Left Brand */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#18181B] dark:text-[#F4F4F6] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] shrink-0"
              aria-label="Toggle workflow steps"
            >
              {mobileNavOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C84B31] to-[#9E351F] text-white flex items-center justify-center shadow-sm shrink-0">
                <Feather className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-serif font-bold text-base sm:text-lg tracking-tight text-[#18181B] dark:text-[#F4F4F6] truncate">
                    VerbaCraft AI
                  </span>
                  <span className="hidden md:inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF6F2] dark:bg-[#221A18] text-[#C84B31] dark:text-[#E06348] border border-[#E6C5BA] dark:border-[#E06348]/40 shrink-0">
                    Writing Studio
                  </span>
                </div>
                <p className="text-[11px] text-[#71717A] dark:text-[#8E96A8] hidden xl:block truncate">
                  Write an article, make it sound human, and download it
                </p>
              </div>
            </div>
          </div>

          {/* Center Workspace Switcher */}
          <nav className="flex min-w-0 items-center gap-1 bg-[#F3EFE8] dark:bg-[#1B1E26] p-1 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveWorkspace("studio")}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspace === "studio"
                  ? "bg-white dark:bg-[#282D3B] text-[#18181B] dark:text-[#F4F4F6] shadow-2xs"
                  : "text-[#52525B] dark:text-[#A1A7B5] hover:text-[#18181B] dark:hover:text-white"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
              <span>Write</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveWorkspace("history");
                fetchHistory();
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspace === "history"
                  ? "bg-white dark:bg-[#282D3B] text-[#18181B] dark:text-[#F4F4F6] shadow-2xs"
                  : "text-[#52525B] dark:text-[#A1A7B5] hover:text-[#18181B] dark:hover:text-white"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
              <span>My articles</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF6F2] dark:bg-[#14161B] text-[#C84B31] dark:text-[#E06348]">
                {historyArticles.length}
              </span>
            </button>

          </nav>

          {/* Right Global Controls: Quick Export + Dark/Light Mode + Reset */}
          <div className="flex min-w-0 items-center gap-2">
            {/* Global Header Quick-Export Dropdown */}
            <div className="relative" ref={headerExportRef}>
              <button
                type="button"
                disabled={!bestAvailableManuscript.trim()}
                onClick={() => setHeaderExportOpen((prev) => !prev)}
                title={
                  bestAvailableManuscript.trim()
                    ? "Download your article to your computer"
                    : "Write your article first to unlock downloading"
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] disabled:bg-[#E6E1D8] dark:disabled:bg-[#242834] text-white disabled:text-[#71717A] dark:disabled:text-[#666E80] text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {headerExportOpen && bestAvailableManuscript.trim() && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#2A2F3D] shadow-xl p-2 z-50 space-y-1">
                  <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#71717A] dark:text-[#8E96A8]">
                    Download to Your PC
                  </div>
                  {(
                    [
                      { fmt: "pdf", label: "PDF Document (.pdf)" },
                      { fmt: "docx", label: "Word Document (.docx)" },
                      { fmt: "html", label: "Styled Web Page (.html)" },
                      { fmt: "txt", label: "Plain Text (.txt)" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.fmt}
                      type="button"
                      onClick={() => handleQuickExportFormat(item.fmt)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-[#FAF6F2] dark:hover:bg-[#252A36] transition-colors cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <Download className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark & Light Mode Toggle */}
            <ThemeToggle />

            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[#E6E1D8] dark:border-[#2A2F3D] min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#F5E8DF] dark:bg-[#35231F] text-[#C84B31] dark:text-[#E57459] flex items-center justify-center text-[11px] font-bold shrink-0">
                {currentUser.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[110px] truncate text-xs font-medium text-[#52525B] dark:text-[#C6CCD9]">
                {currentUser.name.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="p-2 rounded-lg text-[#71717A] dark:text-[#8E96A8] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] hover:text-[#C84B31] dark:hover:text-[#E57459] shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reset Session */}
            <button
              type="button"
              onClick={handleResetSession}
              className="hidden md:inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs font-medium text-[#52525B] dark:text-[#A1A7B5] hover:text-[#18181B] dark:hover:text-white transition-colors cursor-pointer"
              title="Start a brand new article"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">New</span>
            </button>
          </div>
        </div>

        {/* Subtle Top Pipeline Progress Line */}
        {activeWorkspace === "studio" && (
          <div className="h-1 w-full bg-[#EFECE6] dark:bg-[#1B1E26]">
            <div
              className="h-full bg-gradient-to-r from-[#C84B31] via-[#E06348] to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Content Shell */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeWorkspace === "history" ? (
          <ArticleHistoryVault
            articles={historyArticles}
            loading={historyLoading}
            storage={storage}
            onLoadIntoStudio={handleLoadFromHistory}
            onDeleteArticle={handleDeleteFromHistory}
            onNotifyDownload={notifySuccess}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar Pipeline Rail */}
            <aside
              className={`${
                mobileNavOpen ? "block" : "hidden"
              } lg:block lg:col-span-3 lg:sticky lg:top-22 bg-[#F3EFE8] dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-4 space-y-4 shadow-2xs`}
            >
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#52525B] dark:text-[#A1A7B5] font-semibold">
                    Your 8 steps
                  </span>
                  <span className="text-[11px] font-mono text-[#C84B31] dark:text-[#E06348] font-semibold">
                    Step {session.currentStep}/8
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#71717A] dark:text-[#8E96A8]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">{llmStatus}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {WORKFLOW_STEPS.map((st) => {
                  const active = session.currentStep === st.id;
                  const done = isStepCompleted(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSession((prev) => ({ ...prev, currentStep: st.id }));
                        setMobileNavOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                        active
                          ? "bg-white dark:bg-[#1F232E] border border-[#D8C2B8] dark:border-[#E06348]/50 shadow-2xs text-[#18181B] dark:text-[#F4F4F6]"
                          : "hover:bg-white/60 dark:hover:bg-[#1B1E26] text-[#3F3F46] dark:text-[#B8BFCE]"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-[#C84B31] text-white"
                            : done
                            ? "bg-emerald-600 text-white"
                            : "bg-[#E6E1D8] dark:bg-[#252A36] text-[#52525B] dark:text-[#9CA3B5]"
                        }`}
                      >
                        {done && !active ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          `0${st.id}`
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">
                          {st.short}
                        </div>
                        <div className="text-[11px] text-[#71717A] dark:text-[#8E96A8] truncate">
                          {st.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#E2DDD4] dark:border-[#262A34] space-y-2 px-1">
                <div className="flex items-center justify-between text-[11px] text-[#52525B] dark:text-[#A1A7B5]">
                  <span>Your progress</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    Saved automatically
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#71717A] dark:text-[#8E96A8]">
                  Finished articles are added to{" "}
                  <strong className="text-[#18181B] dark:text-[#F4F4F6]">
                    My articles
                  </strong>{" "}
                  on their own, so you never lose work.
                </p>
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="w-full py-2 px-3 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#1B1E26] text-xs font-medium text-[#3F3F46] dark:text-[#D4D8E2] hover:bg-[#FAF8F5] dark:hover:bg-[#242936] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start over</span>
                </button>
                <div className="lg:hidden flex items-center justify-between gap-2 px-2 py-2 rounded-xl bg-white/70 dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[#F5E8DF] dark:bg-[#35231F] text-[#C84B31] dark:text-[#E57459] flex items-center justify-center text-[11px] font-bold shrink-0">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-[11px] font-medium text-[#52525B] dark:text-[#C6CCD9]">
                      {currentUser.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#C84B31] dark:text-[#E57459] hover:bg-[#FAF6F2] dark:hover:bg-[#252631] shrink-0"
                  >
                    <LogOut className="w-3 h-3" /> Sign out
                  </button>
                </div>
              </div>
            </aside>

            {/* Right Main Studio Stage */}
            <main className="lg:col-span-9 space-y-5 min-w-0">
              {/* Locked title banner */}
              {session.fixedTitle && (
                <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] border-l-4 border-l-[#C84B31] dark:border-l-[#E06348] rounded-2xl p-4 sm:px-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                      <Lock className="w-3 h-3" />
                      <span>Your locked title (used in every step)</span>
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-0.5 leading-snug">
                      {session.fixedTitle}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {session.savedArticleId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkspace("history");
                          fetchHistory();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                        title="Open My articles"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved in My articles</span>
                      </button>
                    ) : (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#52525B] dark:text-[#A1A7B5]">
                        Not saved yet
                      </span>
                    )}
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#52525B] dark:text-[#A1A7B5]">
                      {session.targetWordCount} words
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 1 }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#52525B] dark:text-[#A1A7B5] hover:text-[#C84B31] dark:hover:text-[#E06348] hover:bg-[#FAF6F2] dark:hover:bg-[#1B1E26] cursor-pointer"
                      title="Change fixed title"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Loading / Error / Success Feedback Banners */}
              {busyAction && (
                <div className="bg-[#18181B] dark:bg-[#1F2430] border border-transparent dark:border-[#32394A] text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
                  <Loader2 className="w-5 h-5 text-[#E06348] animate-spin shrink-0" />
                  <div className="text-sm font-medium">{busyAction}</div>
                </div>
              )}

              {errorBanner && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{errorBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorBanner(null)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {successBanner && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{successBanner}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessBanner(null)}
                    className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ============================================================
                  STEP 1: TOPIC / IDEA -> AI TITLES -> FIXED SELECTED TITLE
                 ============================================================ */}
              {session.currentStep === 1 && (
                <section className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6F2] dark:bg-[#221A18] border border-[#E6C5BA] dark:border-[#E06348]/40 text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Step 01 · Choose your title</span>
                    </div>
                    <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#18181B] dark:text-[#F4F4F6] tracking-tight">
                      What would you like to write about?
                    </h1>
                    <p className="text-sm sm:text-base text-[#52525B] dark:text-[#A1A7B5] max-w-2xl leading-relaxed">
                      Type your idea in the box below. We will suggest six possible titles.
                      Pick the one you like and lock it in. That exact title is
                      used all the way to the end, so it never changes by
                      accident.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2]">
                      Your topic or idea
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={session.topic}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            topic: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGenerateTitles();
                        }}
                        placeholder="e.g., Agentic AI Workflows in Enterprise Software Teams"
                        className="flex-1 px-4 py-3.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] focus:bg-white dark:focus:bg-[#12141A] text-sm text-[#18181B] dark:text-[#F4F4F6] placeholder:text-[#71717A] dark:placeholder:text-[#70788B] focus:outline-none focus:border-[#C84B31] dark:focus:border-[#E06348] transition-colors"
                      />
                      <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => handleGenerateTitles()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-60 shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Suggest titles</span>
                      </button>
                    </div>

                    {/* Sample Inspiration Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-[#71717A] dark:text-[#8E96A8]">
                        Need an idea? Try one of these:
                      </span>
                      {SAMPLE_TOPICS.map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => {
                            setSession((prev) => ({ ...prev, topic: sample }));
                            handleGenerateTitles(sample);
                          }}
                          className="text-xs px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-[#FAF6F2] dark:hover:bg-[#252A36] border border-[#E6E1D8] dark:border-[#2A2F3D] hover:border-[#C84B31]/60 dark:hover:border-[#E06348]/60 text-[#3F3F46] dark:text-[#D4D8E2] transition-colors cursor-pointer"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generated AI Title Candidates */}
                  {session.titleCandidates.length > 0 && (
                    <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif text-xl font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                          Select & Lock Your Fixed Article Title
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleGenerateTitles()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#C84B31] dark:text-[#E06348] hover:underline cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Suggest again</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {session.titleCandidates.map((cand) => {
                          const isSelected = session.fixedTitle === cand.title;
                          return (
                            <div
                              key={cand.id}
                              onClick={() =>
                                setSession((prev) => ({
                                  ...prev,
                                  fixedTitle: cand.title,
                                }))
                              }
                              className={`cursor-pointer rounded-xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                                isSelected
                                  ? "border-[#C84B31] dark:border-[#E06348] bg-[#FAF6F2] dark:bg-[#221A18] ring-2 ring-[#C84B31]/20 dark:ring-[#E06348]/25"
                                  : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5]/60 dark:bg-[#1B1E26]/70 hover:bg-white dark:hover:bg-[#1F2430] hover:border-[#C8BFAF] dark:hover:border-[#3A4154]"
                              }`}
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#C84B31] dark:text-[#E06348]">
                                    {cand.hookType}
                                  </span>
                                  <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                    SEO {cand.seoScore}/100
                                  </span>
                                </div>
                                <h4 className="font-serif text-lg font-bold text-[#18181B] dark:text-[#F4F4F6] leading-snug">
                                  {cand.title}
                                </h4>
                                <p className="text-xs text-[#52525B] dark:text-[#A1A7B5] leading-relaxed">
                                  {cand.rationale}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLockTitle(cand.title);
                                }}
                                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-[#C84B31] text-white hover:bg-[#B03E26]"
                                    : "bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#18181B] dark:text-[#F4F4F6] hover:border-[#C84B31] dark:hover:border-[#E06348]"
                                }`}
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Use this title and continue</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Optional custom title */}
                      <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] space-y-2">
                        <label className="block text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2]">
                          Want to change the wording? Edit it here:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={customTitleDraft || session.fixedTitle}
                            onChange={(e) => setCustomTitleDraft(e.target.value)}
                            placeholder="Customize your exact headline..."
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleLockTitle(
                                customTitleDraft || session.fixedTitle
                              )
                            }
                            className="px-5 py-2.5 rounded-xl bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold hover:bg-[#C84B31] dark:hover:bg-[#C84B31] transition-colors shrink-0 cursor-pointer"
                          >
                            Use my title →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ============================================================
                  STEP 2: GUIDED QUESTIONS + CATEGORY, AUDIENCE, TONE, WORDS, PURPOSE
                 ============================================================ */}
              {session.currentStep === 2 && (
                <section className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                      Step 02 · A few details about your article
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                      Tell us about your article
                    </h2>
                    <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
                      These answers tell us who the article is for and how it should sound.
                      The questions further down are optional, but answering them
                      makes the finished article feel more personal.
                    </p>
                  </div>

                  {/* Editorial Parameters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#D4D8E2] mb-1.5">
                        Topic area
                      </label>
                      <select
                        value={session.category}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#D4D8E2] mb-1.5">
                        Who is it for?
                      </label>
                      <input
                        type="text"
                        value={session.audience}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            audience: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#D4D8E2] mb-1.5">
                        How should it sound?
                      </label>
                      <select
                        value={session.tone}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            tone: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      >
                        {TONES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#D4D8E2] mb-1.5">
                        What is it for?
                      </label>
                      <select
                        value={session.purpose}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            purpose: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      >
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#D4D8E2]">
                          How long should it be?
                        </label>
                        <span className="font-mono text-sm font-bold text-[#C84B31] dark:text-[#E06348]">
                          {session.targetWordCount.toLocaleString()} words (~
                          {Math.max(1, Math.round(session.targetWordCount / 225))}{" "}
                          min read)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={600}
                        max={2600}
                        step={100}
                        value={session.targetWordCount}
                        onChange={(e) =>
                          setSession((prev) => ({
                            ...prev,
                            targetWordCount: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-[#C84B31]"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-[#71717A] dark:text-[#8E96A8] mt-1">
                        <span>600w (Concise Brief)</span>
                        <span>1,200w (Editorial Feature)</span>
                        <span>2,600w (Deep Pillar)</span>
                      </div>
                    </div>
                  </div>

                  {/* Guided Questions */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                        A few questions to make it yours
                      </h3>
                      <span className="text-xs text-[#71717A] dark:text-[#8E96A8]">
                        Optional — answer any you like
                      </span>
                    </div>

                    {session.guidedQuestions.map((gq, idx) => (
                      <div
                        key={gq.id}
                        className="p-4 rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-white dark:bg-[#181B22] space-y-2"
                      >
                        <label className="block text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                          {idx + 1}. {gq.question}
                        </label>
                        <p className="text-xs text-[#71717A] dark:text-[#8E96A8]">
                          {gq.helperText}
                        </p>
                        <textarea
                          rows={2}
                          value={gq.answer}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSession((prev) => ({
                              ...prev,
                              guidedQuestions: prev.guidedQuestions.map((item) =>
                                item.id === gq.id
                                  ? { ...item, answer: val }
                                  : item
                              ),
                            }));
                          }}
                          placeholder={gq.placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#12141A] focus:bg-white dark:focus:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6] focus:outline-none focus:border-[#C84B31] dark:focus:border-[#E06348]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E1D8] dark:border-[#262A34]">
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 1 }))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={handleGenerateKeywords}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Next: key phrases</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              )}

              {/* ============================================================
                  STEP 3: AI KEYWORDS + USER KEYWORDS
                 ============================================================ */}
              {session.currentStep === 3 && (
                <section className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                      Step 03 · Key phrases
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                      Pick the key phrases to include
                    </h2>
                    <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
                      These are words and phrases your readers may search for. Tap any you
                      want to include, and add your own if you have favourites. We
                      will check at the end that they actually appear in the text.
                    </p>
                  </div>

                  {/* AI Keywords */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
                        Suggested phrases (tap to add or remove)
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateKeywords}
                        className="text-xs text-[#C84B31] dark:text-[#E06348] font-medium hover:underline cursor-pointer"
                      >
                        Refresh Suggestions
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {session.aiKeywords.map((kw) => {
                        const active = session.selectedAiKeywords.includes(kw);
                        return (
                          <button
                            key={kw}
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                selectedAiKeywords: active
                                  ? prev.selectedAiKeywords.filter(
                                      (k) => k !== kw
                                    )
                                  : [...prev.selectedAiKeywords, kw],
                              }))
                            }
                            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                              active
                                ? "bg-[#18181B] dark:bg-[#E06348] text-white border-[#18181B] dark:border-[#E06348]"
                                : "bg-[#FAF8F5] dark:bg-[#1B1E26] text-[#3F3F46] dark:text-[#D4D8E2] border-[#E6E1D8] dark:border-[#2A2F3D] hover:border-[#18181B] dark:hover:border-[#E06348]"
                            }`}
                          >
                            {active ? (
                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-[#71717A] dark:text-[#8E96A8]" />
                            )}
                            <span>{kw}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom User Keywords */}
                  <div className="p-5 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2]">
                      Add your own phrases
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customKeywordInput}
                        onChange={(e) => setCustomKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customKeywordInput.trim()) {
                            e.preventDefault();
                            const additions = customKeywordInput
                              .split(",")
                              .map((s) => s.trim().toLowerCase())
                              .filter(Boolean);
                            setSession((prev) => ({
                              ...prev,
                              userKeywords: Array.from(
                                new Set([...prev.userKeywords, ...additions])
                              ),
                            }));
                            setCustomKeywordInput("");
                          }
                        }}
                        placeholder="Type custom keyword(s), comma-separated..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const additions = customKeywordInput
                            .split(",")
                            .map((s) => s.trim().toLowerCase())
                            .filter(Boolean);
                          if (additions.length === 0) return;
                          setSession((prev) => ({
                            ...prev,
                            userKeywords: Array.from(
                              new Set([...prev.userKeywords, ...additions])
                            ),
                          }));
                          setCustomKeywordInput("");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold hover:bg-[#C84B31] cursor-pointer"
                      >
                        Add phrase
                      </button>
                    </div>

                    {session.userKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {session.userKeywords.map((ukw) => (
                          <span
                            key={ukw}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#14161B] border border-[#C84B31]/40 dark:border-[#E06348]/50 text-xs font-medium text-[#18181B] dark:text-[#F4F4F6]"
                          >
                            <Tag className="w-3 h-3 text-[#C84B31] dark:text-[#E06348]" />
                            <span>{ukw}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSession((prev) => ({
                                  ...prev,
                                  userKeywords: prev.userKeywords.filter(
                                    (x) => x !== ukw
                                  ),
                                }))
                              }
                              className="text-[#71717A] hover:text-red-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E1D8] dark:border-[#262A34]">
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 2 }))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={handleGenerateStructureAndAssets}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Next: outline, pictures & links</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              )}

              {/* ============================================================
                  STEP 4: ARTICLE STRUCTURE / HEADINGS + FAQs
                 ============================================================ */}
              {session.currentStep === 4 && (
                <section className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                        Step 04 · Outline and common questions
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                        Check the sections and questions
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateStructureAndAssets}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#C84B31] dark:text-[#E06348] hover:bg-[#FAF6F2] dark:hover:bg-[#1B1E26] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Suggest again</span>
                    </button>
                  </div>

                  {/* Outline Sections */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#C84B31] dark:text-[#E06348]" />
                      Sections ({session.outline.length})
                    </h3>

                    {session.outline.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className="p-4 rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5]/70 dark:bg-[#1B1E26] space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={sec.level}
                            onChange={(e) => {
                              const lv =
                                e.target.value === "H3" ? "H3" : "H2";
                              setSession((prev) => ({
                                ...prev,
                                outline: prev.outline.map((s) =>
                                  s.id === sec.id ? { ...s, level: lv } : s
                                ),
                              }));
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] font-mono text-xs font-bold text-[#C84B31] dark:text-[#E06348]"
                          >
                            <option value="H2">H2</option>
                            <option value="H3">H3</option>
                          </select>

                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSession((prev) => ({
                                ...prev,
                                outline: prev.outline.map((s) =>
                                  s.id === sec.id ? { ...s, heading: val } : s
                                ),
                              }));
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6]"
                          />

                          <span className="hidden sm:inline font-mono text-xs text-[#71717A] dark:text-[#8E96A8]">
                            ~{sec.estimatedWords}w
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                outline: prev.outline.filter(
                                  (s) => s.id !== sec.id
                                ),
                              }))
                            }
                            disabled={session.outline.length <= 2}
                            className="p-1.5 text-[#71717A] hover:text-red-600 disabled:opacity-30 cursor-pointer"
                            title={`Remove section ${idx + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="pl-14 text-xs text-[#52525B] dark:text-[#A1A7B5]">
                          Key points: {sec.keyPoints.join(" · ")}
                        </div>
                      </div>
                    ))}

                    {/* Add Section */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newHeadingInput}
                        onChange={(e) => setNewHeadingInput(e.target.value)}
                        placeholder="Add custom H2 section heading..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-sm text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newHeadingInput.trim()) return;
                          setSession((prev) => ({
                            ...prev,
                            outline: [
                              ...prev.outline,
                              {
                                id: `sec-custom-${Date.now()}`,
                                heading: newHeadingInput.trim(),
                                level: "H2",
                                keyPoints: [
                                  "Custom author-specified angle and practical analysis",
                                ],
                                estimatedWords: 200,
                              },
                            ],
                          }));
                          setNewHeadingInput("");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold hover:bg-[#C84B31] cursor-pointer"
                      >
                        + Add Heading
                      </button>
                    </div>
                  </div>

                  {/* FAQs */}
                  <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2]">
                      Common questions (untick any you do not want)
                    </h3>
                    <div className="space-y-2.5">
                      {session.faqs.map((faq) => (
                        <div
                          key={faq.id}
                          className={`p-4 rounded-xl border transition-colors ${
                            faq.included
                              ? "border-[#C84B31]/40 dark:border-[#E06348]/40 bg-[#FAF6F2]/60 dark:bg-[#221A18]"
                              : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5]/50 dark:bg-[#1B1E26]/50 opacity-65"
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={faq.included}
                              onChange={() =>
                                setSession((prev) => ({
                                  ...prev,
                                  faqs: prev.faqs.map((f) =>
                                    f.id === faq.id
                                      ? { ...f, included: !f.included }
                                      : f
                                  ),
                                }))
                              }
                              className="mt-1 accent-[#C84B31]"
                            />
                            <div className="space-y-1 flex-1">
                              <div className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                                {faq.question}
                              </div>
                              <p className="text-xs text-[#52525B] dark:text-[#A1A7B5] leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Add custom FAQ */}
                    <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34] space-y-2.5">
                      <div className="text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2]">
                        Add your own question and answer
                      </div>
                      <input
                        type="text"
                        value={newFaqQuestion}
                        onChange={(e) => setNewFaqQuestion(e.target.value)}
                        placeholder="Question..."
                        className="w-full px-3 py-2 rounded-lg border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFaqAnswer}
                          onChange={(e) => setNewFaqAnswer(e.target.value)}
                          placeholder="Concise answer..."
                          className="flex-1 px-3 py-2 rounded-lg border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFaqQuestion.trim() || !newFaqAnswer.trim())
                              return;
                            setSession((prev) => ({
                              ...prev,
                              faqs: [
                                ...prev.faqs,
                                {
                                  id: `faq-${Date.now()}`,
                                  question: newFaqQuestion.trim(),
                                  answer: newFaqAnswer.trim(),
                                  included: true,
                                },
                              ],
                            }));
                            setNewFaqQuestion("");
                            setNewFaqAnswer("");
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold cursor-pointer"
                        >
                          Add FAQ
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E1D8] dark:border-[#262A34]">
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 3 }))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 5 }))
                      }
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <span>Next: pictures & links</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              )}

              {/* ============================================================
                  STEP 5: IMAGE / VIDEO / EXTERNAL LINK SELECTION
                 ============================================================ */}
              {session.currentStep === 5 && (
                <section className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-7">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                      Step 05 · Pictures, videos and links
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                      Choose the extras for your article
                    </h2>
                    <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
                      Pick the photos, videos and source links you would like included. Tap a
                      card to add or remove it. You can also paste your own links
                      below each list.
                    </p>
                  </div>

                  {/* Images Grid */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#C84B31] dark:text-[#E06348]" />
                      Pictures ({selectedImages.length} selected)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {session.images.map((img) => (
                        <div
                          key={img.id}
                          onClick={() =>
                            setSession((prev) => ({
                              ...prev,
                              images: prev.images.map((x) =>
                                x.id === img.id
                                  ? { ...x, selected: !x.selected }
                                  : x
                              ),
                            }))
                          }
                          className={`cursor-pointer rounded-xl overflow-hidden border transition-all ${
                            img.selected
                              ? "border-[#C84B31] dark:border-[#E06348] ring-2 ring-[#C84B31]/15 bg-[#FAF6F2] dark:bg-[#221A18]"
                              : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26] opacity-75 hover:opacity-100"
                          }`}
                        >
                          <div className="relative h-44 bg-zinc-200 dark:bg-zinc-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.alt}
                              className="w-full h-full object-cover"
                            />
                            <span
                              className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                img.selected
                                  ? "bg-[#C84B31] text-white"
                                  : "bg-white/90 text-[#18181B]"
                              }`}
                            >
                              {img.selected ? "✓ Included" : "Click to Include"}
                            </span>
                          </div>
                          <div className="p-3.5 space-y-1">
                            <div className="text-xs font-medium text-[#18181B] dark:text-[#F4F4F6] line-clamp-2">
                              {img.caption}
                            </div>
                            <div className="text-[11px] font-mono text-[#71717A] dark:text-[#8E96A8]">
                              Credit: {img.photographer}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom Image Addition */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        placeholder="Add custom image URL (https://...)"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <input
                        type="text"
                        value={customImageCaption}
                        onChange={(e) => setCustomImageCaption(e.target.value)}
                        placeholder="Image caption..."
                        className="flex-1 px-3 py-2 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customImageUrl.trim()) return;
                          setSession((prev) => ({
                            ...prev,
                            images: [
                              ...prev.images,
                              {
                                id: `img-custom-${Date.now()}`,
                                url: customImageUrl.trim(),
                                alt:
                                  customImageCaption.trim() ||
                                  session.fixedTitle,
                                caption:
                                  customImageCaption.trim() ||
                                  "Author-supplied visual figure.",
                                photographer: "Custom Asset",
                                placement: "inline",
                                selected: true,
                              },
                            ],
                          }));
                          setCustomImageUrl("");
                          setCustomImageCaption("");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        + Add Image
                      </button>
                    </div>
                  </div>

                  {/* Videos Selection */}
                  <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2] flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-[#C84B31] dark:text-[#E06348]" />
                      Videos ({selectedVideos.length} selected)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {session.videos.map((vid) => (
                        <div
                          key={vid.id}
                          onClick={() =>
                            setSession((prev) => ({
                              ...prev,
                              videos: prev.videos.map((v) =>
                                v.id === vid.id
                                  ? { ...v, selected: !v.selected }
                                  : v
                              ),
                            }))
                          }
                          className={`cursor-pointer rounded-xl border p-3.5 space-y-2 transition-all ${
                            vid.selected
                              ? "border-[#C84B31] dark:border-[#E06348] bg-[#FAF6F2] dark:bg-[#221A18]"
                              : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26]"
                          }`}
                        >
                          <div className="relative h-28 rounded-lg overflow-hidden bg-zinc-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={vid.thumbnailUrl}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px]">
                              {vid.duration}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#C84B31] dark:text-[#E06348]">
                            {vid.channel}
                          </div>
                          <div className="text-xs font-semibold text-[#18181B] dark:text-[#F4F4F6] line-clamp-2">
                            {vid.title}
                          </div>
                          <div className="text-[11px] font-semibold text-[#52525B] dark:text-[#A1A7B5]">
                            {vid.selected ? "✓ Embedded in Article" : "Click to Embed"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* External Links / Citations */}
                  <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#27272A] dark:text-[#D4D8E2] flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-[#C84B31] dark:text-[#E06348]" />
                      Sources and links ({selectedLinks.length} selected)
                    </h3>

                    <div className="space-y-2">
                      {session.links.map((lnk) => (
                        <label
                          key={lnk.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                            lnk.selected
                              ? "border-[#C84B31]/50 dark:border-[#E06348]/50 bg-[#FAF6F2]/70 dark:bg-[#221A18]"
                              : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5]/60 dark:bg-[#1B1E26]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={lnk.selected}
                            onChange={() =>
                              setSession((prev) => ({
                                ...prev,
                                links: prev.links.map((l) =>
                                  l.id === lnk.id
                                    ? { ...l, selected: !l.selected }
                                    : l
                                ),
                              }))
                            }
                            className="mt-1 accent-[#C84B31]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                                {lnk.title}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#C84B31] dark:text-[#E06348]">
                                {lnk.authorityType} · {lnk.domain}
                              </span>
                            </div>
                            <p className="text-xs text-[#52525B] dark:text-[#A1A7B5] mt-0.5">
                              {lnk.snippet}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Add Custom Reference */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        value={customRefTitle}
                        onChange={(e) => setCustomRefTitle(e.target.value)}
                        placeholder="Custom source title..."
                        className="flex-1 px-3 py-2 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <input
                        type="url"
                        value={customRefUrl}
                        onChange={(e) => setCustomRefUrl(e.target.value)}
                        placeholder="https://example.org/study"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#D8D2C7] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] text-xs text-[#18181B] dark:text-[#F4F4F6]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customRefTitle.trim() || !customRefUrl.trim())
                            return;
                          let domain = "external-source";
                          try {
                            domain = new URL(customRefUrl.trim()).hostname;
                          } catch {}
                          setSession((prev) => ({
                            ...prev,
                            links: [
                              ...prev.links,
                              {
                                id: `ref-custom-${Date.now()}`,
                                title: customRefTitle.trim(),
                                url: customRefUrl.trim(),
                                domain,
                                authorityType: "Editorial",
                                snippet: "Author-selected external citation.",
                                selected: true,
                              },
                            ],
                          }));
                          setCustomRefTitle("");
                          setCustomRefUrl("");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#18181B] dark:bg-[#E06348] text-white text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        + Add Citation
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E1D8] dark:border-[#262A34]">
                    <button
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({ ...prev, currentStep: 4 }))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={handleGenerateFullArticle}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Write my article</span>
                    </button>
                  </div>
                </section>
              )}

              {/* ============================================================
                  STEP 6: FIRST DRAFT, QUALITY CHECK AND DOWNLOAD
                 ============================================================ */}
              {session.currentStep === 6 && (
                <section className="space-y-6">
                  <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                          Step 06 · Your first draft and a quick quality check
                        </span>
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                          Here is your first draft
                        </h2>
                        <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
                          Here is your draft plus a simple check of how easy it is to read, how
                      varied the sentences are and which phrases came out too
                      robotic. You can download this version or make it sound more
                      human in the next step.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={Boolean(busyAction)}
                          onClick={handleGenerateFullArticle}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] text-xs font-semibold text-[#18181B] dark:text-[#F4F4F6] hover:bg-[#FAF8F5] dark:hover:bg-[#1B1E26] cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSession((prev) => ({ ...prev, currentStep: 7 }))
                          }
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Wand2 className="w-4 h-4" />
                          <span>Make it sound human →</span>
                        </button>
                      </div>
                    </div>

                    {!session.rawDraft ? (
                      <div className="p-10 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-dashed border-[#D8D2C7] dark:border-[#2A2F3D] text-center space-y-3">
                        <p className="text-sm text-[#52525B] dark:text-[#A1A7B5]">
                          Ready to synthesize your complete article under your
                          locked title.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateFullArticle}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C84B31] text-white text-sm font-semibold cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Article Now</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {session.beforeAnalysis && (
                          <AnalysisDashboard
                            analysis={session.beforeAnalysis}
                            title="Your first draft — quality check"
                          />
                        )}

                        <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34]">
                          <ExportToolbar
                            title={session.fixedTitle || "AI Draft Article"}
                            category={session.category}
                            audience={session.audience}
                            tone={session.tone}
                            markdown={session.rawDraft}
                            wordCount={session.beforeAnalysis?.wordCount}
                            readabilityScore={
                              session.beforeAnalysis?.fleschReadingEase
                            }
                            naturalnessScore={
                              session.beforeAnalysis?.humanNaturalnessScore
                            }
                            selectedImages={selectedImages}
                            selectedVideos={selectedVideos}
                            selectedLinks={selectedLinks}
                            label="Download this first draft"
                            compact
                            onSuccess={notifySuccess}
                            onError={setErrorBanner}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {session.rawDraft && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-[#52525B] dark:text-[#A1A7B5] font-semibold">
                          Your first draft
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSession((prev) => ({ ...prev, currentStep: 7 }))
                          }
                          className="text-xs font-semibold text-[#C84B31] dark:text-[#E06348] hover:underline cursor-pointer"
                        >
                          Next: make it sound human →
                        </button>
                      </div>
                      <MarkdownPreview
                        markdown={session.rawDraft}
                        selectedVideos={selectedVideos}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* ============================================================
                  STEP 7: HUMANIZATION + BEFORE / AFTER ANALYSIS + EXPORT
                 ============================================================ */}
              {session.currentStep === 7 && (
                <section className="space-y-6">
                  <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[#15803D] dark:text-emerald-400 font-semibold">
                        Step 07 · Make it sound human
                      </span>
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                        Make the writing sound like a real person
                      </h2>
                      <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1">
                        This step rewrites stiff, machine-sounding lines into natural writing.
                      Your title, pictures, links and questions stay exactly the
                      same. Choose a style and we will show you the before and after.
                      </p>
                    </div>

                    {/* Voice Style Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {HUMANIZATION_STYLES.map((st) => {
                        const active = session.humanizationStyle === st.name;
                        return (
                          <button
                            key={st.name}
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                humanizationStyle: st.name,
                              }))
                            }
                            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                              active
                                ? "border-[#15803D] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/35 ring-2 ring-[#15803D]/15"
                                : "border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-white dark:hover:bg-[#232834]"
                            }`}
                          >
                            <div className="text-xs font-bold text-[#18181B] dark:text-[#F4F4F6]">
                              {st.name}
                            </div>
                            <p className="text-[11px] text-[#52525B] dark:text-[#A1A7B5] mt-1 leading-relaxed">
                              {st.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Intensity + Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#1B1E26] border border-[#E6E1D8] dark:border-[#262A34]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#3F3F46] dark:text-[#D4D8E2]">
                          How much should change:
                        </span>
                        {(["light", "balanced", "deep"] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                humanizationIntensity: lvl,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-semibold transition-colors cursor-pointer ${
                              session.humanizationIntensity === lvl
                                ? "bg-[#18181B] dark:bg-emerald-600 text-white"
                                : "bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#2A2F3D] text-[#52525B] dark:text-[#A1A7B5]"
                            }`}
                          >
                            {lvl === "light" ? "Light touch" : lvl === "deep" ? "Big rewrite" : "Balanced"}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={handleHumanize}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>
                          {session.humanizedDraft
                            ? "Rewrite it again"
                            : "Make it sound human"}
                        </span>
                      </button>
                    </div>

                    {/* Before / After Delta Analysis + Direct PC Export */}
                    {session.afterAnalysis && session.humanizedDraft && (
                      <div className="pt-5 border-t border-[#E6E1D8] dark:border-[#262A34] space-y-6">
                        <AnalysisDashboard
                          analysis={session.afterAnalysis}
                          baselineAnalysis={session.beforeAnalysis}
                          title="After the rewrite — before and after comparison"
                        />

                        {/* Full Export Toolbar right inside Step 7 */}
                        <div className="p-4 rounded-xl bg-[#FAF8F5]/70 dark:bg-[#181B22] border border-[#E6E1D8] dark:border-[#262A34]">
                          <ExportToolbar
                            title={session.fixedTitle || "Humanized Article"}
                            category={session.category}
                            audience={session.audience}
                            tone={session.tone}
                            markdown={session.humanizedDraft}
                            wordCount={session.afterAnalysis.wordCount}
                            readabilityScore={
                              session.afterAnalysis.fleschReadingEase
                            }
                            naturalnessScore={
                              session.afterAnalysis.humanNaturalnessScore
                            }
                            selectedImages={selectedImages}
                            selectedVideos={selectedVideos}
                            selectedLinks={selectedLinks}
                            label="Download the natural-sounding version"
                            compact
                            onSuccess={notifySuccess}
                            onError={setErrorBanner}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1B1E26] p-1 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D]">
                            <button
                              type="button"
                              onClick={() => setDiffMode("side-by-side")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                diffMode === "side-by-side"
                                  ? "bg-white dark:bg-[#282D3B] text-[#18181B] dark:text-[#F4F4F6] shadow-2xs"
                                  : "text-[#52525B] dark:text-[#A1A7B5]"
                              }`}
                            >
                              Before and after, side by side
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiffMode("humanized")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                                diffMode === "humanized"
                                  ? "bg-white dark:bg-[#282D3B] text-[#18181B] dark:text-[#F4F4F6] shadow-2xs"
                                  : "text-[#52525B] dark:text-[#A1A7B5]"
                              }`}
                            >
                              Readable article view
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                currentStep: 8,
                              }))
                            }
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C84B31] hover:bg-[#B03E26] text-white text-xs font-semibold cursor-pointer"
                          >
                            <span>Open the editor</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        {diffMode === "side-by-side" ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Panel A: Before Raw AI Draft */}
                            <div className="rounded-xl border border-[#E6E1D8] dark:border-[#262A34] bg-[#FAF8F5] dark:bg-[#1B1E26] p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E1D8] dark:border-[#2A2F3D]">
                                <div className="text-xs font-mono">
                                  <span className="font-semibold text-amber-800 dark:text-amber-300 uppercase">
                                    First draft (before)
                                  </span>
                                  <span className="ml-2 text-[#71717A] dark:text-[#8E96A8]">
                                    {
                                      session.beforeAnalysis
                                        ?.humanNaturalnessScore
                                    }
                                    /100
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(["pdf", "docx", "txt"] as const).map(
                                    (fmt) => (
                                      <button
                                        key={fmt}
                                        type="button"
                                        onClick={() =>
                                          handleQuickExportFormat(
                                            fmt,
                                            session.rawDraft,
                                            "Raw-Draft"
                                          )
                                        }
                                        className="px-2 py-0.5 rounded border border-[#D8D2C7] dark:border-[#2A2F3D] bg-white dark:bg-[#14161B] hover:bg-[#18181B] hover:text-white text-[10px] font-mono uppercase font-semibold cursor-pointer"
                                      >
                                        {fmt}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-[#3F3F46] dark:text-[#C6CCD9] max-h-[460px] overflow-y-auto pr-1">
                                {session.rawDraft}
                              </pre>
                            </div>

                            {/* Panel B: After Humanized Draft */}
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/25 dark:bg-emerald-950/20 p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/80 dark:border-emerald-800/60">
                                <div className="text-xs font-mono">
                                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 uppercase">
                                    Natural version (after · {session.humanizationStyle})
                                  </span>
                                  <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-bold">
                                    {session.afterAnalysis.humanNaturalnessScore}
                                    /100
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(["pdf", "docx", "html", "txt"] as const).map(
                                    (fmt) => (
                                      <button
                                        key={fmt}
                                        type="button"
                                        onClick={() =>
                                          handleQuickExportFormat(
                                            fmt,
                                            session.humanizedDraft,
                                            "Humanized"
                                          )
                                        }
                                        className="px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#14161B] hover:bg-emerald-700 hover:text-white text-[10px] font-mono uppercase font-semibold text-emerald-900 dark:text-emerald-300 cursor-pointer"
                                      >
                                        {fmt}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-[#18181B] dark:text-[#F4F4F6] max-h-[460px] overflow-y-auto pr-1">
                                {session.humanizedDraft}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <MarkdownPreview
                            markdown={session.humanizedDraft}
                            selectedVideos={selectedVideos}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ============================================================
                  STEP 8: ARTICLE EDITOR, LIVE PREVIEW, SAVE TO DB & EXPORT
                 ============================================================ */}
              {session.currentStep === 8 && (
                <section className="space-y-6">
                  {/* Top Publishing & Multi-Format Export Action Bar */}
                  <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 shadow-xs space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-[#C84B31] dark:text-[#E06348] font-semibold">
                          Step 08 · Edit, save and download
                        </span>
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18181B] dark:text-[#F4F4F6] mt-1">
                          Your finished article
                        </h2>
                        <p className="text-sm text-[#52525B] dark:text-[#A1A7B5] mt-1 max-w-2xl">
                          Change anything you like in the box on the left and the
                          preview updates as you type. Your article is already
                          saved in{" "}
                          <strong className="text-[#18181B] dark:text-white">
                            My articles
                          </strong>
                          , and you can download it as a PDF, Word, HTML or text
                          file at any time.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={Boolean(busyAction)}
                          onClick={handleSaveToDatabase}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>
                            {session.savedArticleId
                              ? "Update my saved copy"
                              : "Save to My articles"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleRefreshLiveAnalysis(session.finalContent)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E6E1D8] dark:border-[#2A2F3D] bg-[#FAF8F5] dark:bg-[#1B1E26] hover:bg-white dark:hover:bg-[#252A36] text-xs font-semibold text-[#18181B] dark:text-[#F4F4F6] cursor-pointer"
                        >
                          <BookOpenCheck className="w-4 h-4 text-[#C84B31] dark:text-[#E06348]" />
                          <span>Update score</span>
                        </button>
                      </div>
                    </div>

                    {/* Dedicated 4-Format PC Export Toolbar */}
                    <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#262A34]">
                      <ExportToolbar
                        title={session.fixedTitle || "Intelligent Article"}
                        category={session.category}
                        audience={session.audience}
                        tone={session.tone}
                        markdown={bestAvailableManuscript}
                        wordCount={session.liveAnalysis?.wordCount}
                        readabilityScore={
                          session.liveAnalysis?.fleschReadingEase
                        }
                        naturalnessScore={
                          session.liveAnalysis?.humanNaturalnessScore
                        }
                        selectedImages={selectedImages}
                        selectedVideos={selectedVideos}
                        selectedLinks={selectedLinks}
                        label="Download your finished article"
                        onSuccess={notifySuccess}
                        onError={setErrorBanner}
                      />
                    </div>
                  </div>

                  {/* Mode switcher: edit, preview, or both */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 bg-white dark:bg-[#14161B] p-1 rounded-xl border border-[#E6E1D8] dark:border-[#262A34]">
                      <button
                        type="button"
                        onClick={() => setStep8Tab("split")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          step8Tab === "split"
                            ? "bg-[#18181B] dark:bg-[#E06348] text-white"
                            : "text-[#52525B] dark:text-[#A1A7B5]"
                        }`}
                      >
                        Edit and preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep8Tab("editor")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          step8Tab === "editor"
                            ? "bg-[#18181B] dark:bg-[#E06348] text-white"
                            : "text-[#52525B] dark:text-[#A1A7B5]"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Write & edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep8Tab("preview")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          step8Tab === "preview"
                            ? "bg-[#18181B] dark:bg-[#E06348] text-white"
                            : "text-[#52525B] dark:text-[#A1A7B5]"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>

                    <span className="text-xs font-mono text-[#52525B] dark:text-[#A1A7B5]">
                      {
                        (
                          session.finalContent
                            .trim()
                            .match(/[A-Za-z0-9'’-]+/g) ?? []
                        ).length
                      }{" "}
                      words · {session.finalContent.length.toLocaleString()}{" "}
                      characters
                    </span>
                  </div>

                  <div
                    className={`grid gap-5 ${
                      step8Tab === "split"
                        ? "grid-cols-1 xl:grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {(step8Tab === "split" || step8Tab === "editor") && (
                      <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl overflow-hidden flex flex-col shadow-xs">
                        <div className="px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1B1E26] border-b border-[#E6E1D8] dark:border-[#262A34] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => insertMarkdownAtCursor("\n## ", "\n")}
                              title="Insert H2 Heading"
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#262B38] text-[#3F3F46] dark:text-[#D4D8E2] cursor-pointer"
                            >
                              <Heading2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownAtCursor("\n### ", "\n")}
                              title="Insert H3 Subheading"
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#262B38] text-[#3F3F46] dark:text-[#D4D8E2] cursor-pointer"
                            >
                              <Heading3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownAtCursor("**", "**")}
                              title="Bold"
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#262B38] text-[#3F3F46] dark:text-[#D4D8E2] cursor-pointer"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownAtCursor("\n> ", "\n")}
                              title="Blockquote"
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#262B38] text-[#3F3F46] dark:text-[#D4D8E2] cursor-pointer"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownAtCursor("\n- ", "")}
                              title="Bullet Item"
                              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#262B38] text-[#3F3F46] dark:text-[#D4D8E2] cursor-pointer"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRefreshLiveAnalysis(session.finalContent)
                            }
                            className="text-xs text-[#C84B31] dark:text-[#E06348] font-semibold hover:underline cursor-pointer"
                          >
                            Update the score
                          </button>
                        </div>
                        <textarea
                          ref={editorRef}
                          value={session.finalContent}
                          onChange={(e) => {
                            const updated = e.target.value;
                            setSession((prev) => ({
                              ...prev,
                              finalContent: updated,
                            }));
                          }}
                          onBlur={() =>
                            handleRefreshLiveAnalysis(session.finalContent)
                          }
                          rows={26}
                          placeholder="Write or edit your article here..."
                          className="w-full flex-1 p-5 bg-white dark:bg-[#14161B] font-mono text-xs sm:text-sm leading-relaxed text-[#18181B] dark:text-[#F4F4F6] focus:outline-none resize-y"
                        />
                      </div>
                    )}

                    {(step8Tab === "split" || step8Tab === "preview") && (
                      <div className="max-h-[820px] overflow-y-auto rounded-2xl">
                        <MarkdownPreview
                          markdown={session.finalContent}
                          selectedVideos={selectedVideos}
                        />
                      </div>
                    )}
                  </div>

                  {session.liveAnalysis && (
                    <div className="bg-white dark:bg-[#14161B] border border-[#E6E1D8] dark:border-[#262A34] rounded-2xl p-6 shadow-xs">
                      <AnalysisDashboard
                        analysis={session.liveAnalysis}
                        baselineAnalysis={session.beforeAnalysis}
                        title="Live quality check (compared to your first draft)"
                      />
                    </div>
                  )}
                </section>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
