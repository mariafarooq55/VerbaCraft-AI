"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Feather,
  FileText,
  Image as ImageIcon,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ThemeToggle } from "./ThemeProvider";

const features = [
  {
    icon: Sparkles,
    eyebrow: "Start anywhere",
    title: "A small idea is enough.",
    copy: "Tell us what you have in mind. We will help you find a title, a clear plan and the right words to get started.",
  },
  {
    icon: WandSparkles,
    eyebrow: "Make it yours",
    title: "Your point of view stays in.",
    copy: "Answer a few simple questions, add the details that matter to you, then shape the article until it sounds like you.",
  },
  {
    icon: FileText,
    eyebrow: "Keep and share",
    title: "Your work is always close by.",
    copy: "Finished articles are saved to your account automatically. Download a polished copy to read, share or print.",
  },
];

const steps = [
  "Choose a title",
  "Tell us who it is for",
  "Build your first draft",
  "Polish, save and share",
];

export function PublicLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF8F5] dark:bg-[#0C0D10] text-[#18181B] dark:text-[#F4F4F6]">
      <header className="relative z-20 border-b border-[#E8E1D7] dark:border-[#242834] bg-[#FAF8F5]/85 dark:bg-[#0C0D10]/85 backdrop-blur-xl">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="VerbaCraft AI home">
            <span className="w-10 h-10 rounded-[14px] bg-[#C84B31] text-white flex items-center justify-center shadow-sm">
              <Feather className="w-[19px] h-[19px]" />
            </span>
            <span>
              <span className="block font-serif text-[20px] leading-5 font-bold tracking-tight">
                VerbaCraft
              </span>
              <span className="block mt-1 text-[9px] uppercase tracking-[.24em] text-[#77716A] dark:text-[#9699A3]">
                Your writing studio
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#5C5954] dark:text-[#B5B8C2]">
            <a href="#how-it-works" className="hover:text-[#C84B31] transition-colors">How it works</a>
            <a href="#what-you-can-do" className="hover:text-[#C84B31] transition-colors">What you can do</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login?next=%2Fstudio"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#33302D] dark:text-[#F4F4F6] hover:bg-white dark:hover:bg-[#1B1E26] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register?next=%2Fstudio"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#C84B31] hover:bg-[#AD3D26] text-white text-[13px] font-semibold shadow-sm transition-all hover:-translate-y-0.5"
            >
              <span>Create an account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 right-[-12%] w-[680px] h-[680px] rounded-full bg-[radial-gradient(circle,rgba(222,130,96,.16),rgba(222,130,96,0)_68%)] dark:bg-[radial-gradient(circle,rgba(200,75,49,.12),rgba(200,75,49,0)_68%)]" />
          <div className="absolute bottom-0 left-[-12%] w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(178,190,142,.18),rgba(178,190,142,0)_70%)] dark:bg-[radial-gradient(circle,rgba(107,128,77,.1),rgba(107,128,77,0)_70%)]" />
          <div className="absolute inset-0 opacity-[.11] dark:opacity-[.04] [background-image:radial-gradient(#6D6258_0.7px,transparent_0.7px)] [background-size:19px_19px]" />
        </div>

        <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_.98fr] gap-12 lg:gap-8 items-center">
            <div className="max-w-[650px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D8C9] dark:border-[#35313A] bg-white/65 dark:bg-[#171820]/80 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#65584C] dark:text-[#D1C4B9] shadow-[0_2px_8px_rgba(52,38,24,.04)]">
                <span className="flex w-5 h-5 items-center justify-center rounded-full bg-[#F5E6D8] dark:bg-[#3A2420] text-[#C84B31]">
                  <Sparkles className="w-3 h-3" />
                </span>
                GOOD WRITING, ONE STEP AT A TIME
              </div>

              <h1 className="mt-7 font-serif text-[3.2rem] sm:text-[4.1rem] lg:text-[5.15rem] leading-[.99] tracking-[-.055em] font-semibold text-[#24201D] dark:text-[#FAF7F1]">
                Your idea,
                <br />
                <span className="italic font-normal text-[#C84B31] dark:text-[#E57459]">beautifully</span>
                <br />
                written.
              </h1>

              <p className="mt-6 max-w-[540px] text-[16px] sm:text-[18px] leading-[1.8] text-[#66605A] dark:text-[#B5B5BF]">
                Turn the idea in your head into an article you are proud to share.
                Get help with the first draft, make it sound like you, then save
                or download the finished piece.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register?next=%2Fstudio"
                  className="group inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#C84B31] hover:bg-[#AD3D26] text-white text-[15px] font-semibold shadow-[0_12px_28px_rgba(160,62,38,.2)] transition-all hover:-translate-y-0.5"
                >
                  <span>I want to create an article</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-[#DDD4C9] dark:border-[#343540] bg-white/50 dark:bg-[#171820]/50 text-[#45403B] dark:text-[#E0DFE3] text-[14px] font-semibold hover:bg-white dark:hover:bg-[#1C1D27] transition-colors"
                >
                  <span>See how it works</span>
                  <ArrowDown className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#77716A] dark:text-[#9699A3]">
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#55724D]" /> Your work saves as you go</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#55724D]" /> No writing experience needed</span>
              </div>
            </div>

            {/* A small editorial preview of the product */}
            <div className="relative mx-auto w-full max-w-[570px] lg:ml-auto">
              <div className="absolute -inset-5 rounded-[34px] bg-gradient-to-br from-[#E8C9B4]/55 via-transparent to-[#B9C39B]/45 blur-2xl" />
              <div className="relative rounded-[26px] border border-[#E2D9CD] dark:border-[#34313A] bg-[#FDFBF8] dark:bg-[#15161D] p-3 shadow-[0_30px_90px_rgba(43,34,24,.15)] rotate-[1deg]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EEE8E0] dark:border-[#292A33]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E59078]" />
                    <span className="w-2 h-2 rounded-full bg-[#D7B870]" />
                    <span className="w-2 h-2 rounded-full bg-[#91A47A]" />
                  </div>
                  <span className="font-mono text-[9px] tracking-[.15em] uppercase text-[#9A9288]">Your writing desk</span>
                  <span className="w-10" />
                </div>

                <div className="grid grid-cols-[1fr_150px] sm:grid-cols-[1fr_168px] min-h-[360px]">
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[.17em] text-[#C84B31] font-semibold">
                      <span className="w-5 h-px bg-[#C84B31]" /> YOUR ARTICLE
                    </div>
                    <h2 className="mt-3 font-serif text-[1.7rem] sm:text-[2rem] leading-[1.05] font-semibold tracking-tight text-[#27221E] dark:text-[#F4F0E9]">
                      Small rituals,
                      <br />
                      <span className="italic text-[#A65C45] dark:text-[#E18A70]">meaningful mornings</span>
                    </h2>
                    <div className="mt-4 flex items-center gap-2 text-[9px] text-[#8D857C] dark:text-[#9699A3]">
                      <span>Wellbeing</span><span>·</span><span>4 min read</span><span>·</span><span className="text-[#55724D]">Saved</span>
                    </div>
                    <div className="mt-5 h-[112px] rounded-xl overflow-hidden bg-[linear-gradient(135deg,#D9C7AC,#EDF0E7_48%,#A4AC91)] relative">
                      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_65%_85%,#7D6A56_0,transparent_38%),linear-gradient(0deg,rgba(59,54,44,.28),transparent_60%)]" />
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-white/75 text-[8px] uppercase tracking-wider text-[#4E4942]">A quieter start</div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-2 rounded-full bg-[#E8E2D9] dark:bg-[#30303A] w-full" />
                      <div className="h-2 rounded-full bg-[#E8E2D9] dark:bg-[#30303A] w-[94%]" />
                      <div className="h-2 rounded-full bg-[#E8E2D9] dark:bg-[#30303A] w-[82%]" />
                      <div className="h-2 rounded-full bg-[#E8E2D9] dark:bg-[#30303A] w-[89%]" />
                    </div>
                    <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#EAF0E4] dark:bg-[#253022] px-2.5 py-1 text-[9px] font-medium text-[#4C6745] dark:text-[#AFCB9D]">
                      <WandSparkles className="w-3 h-3" /> Sounds natural
                    </div>
                  </div>

                  <div className="border-l border-[#EEE8E0] dark:border-[#292A33] p-3.5 sm:p-4 bg-[#F7F4EF] dark:bg-[#191A22] rounded-r-[22px]">
                    <div className="text-[8px] uppercase tracking-[.16em] font-semibold text-[#898176] dark:text-[#A3A1AA]">Your steps</div>
                    <div className="mt-4 space-y-3.5">
                      {[
                        ["01", "Pick a title", true],
                        ["02", "Add your details", true],
                        ["03", "Write a first draft", true],
                        ["04", "Make it your voice", false],
                        ["05", "Download & share", false],
                      ].map(([num, text, done]) => (
                        <div key={String(num)} className="flex gap-2.5 items-start">
                          <span className={`flex w-[19px] h-[19px] items-center justify-center rounded-full text-[8px] font-bold ${done ? "bg-[#55724D] text-white" : "border border-[#D5CCC0] dark:border-[#444550] text-[#857D73] dark:text-[#9699A3]"}`}>
                            {done ? <Check className="w-3 h-3" /> : num}
                          </span>
                          <span className={`text-[9px] leading-[1.45] pt-0.5 ${done ? "text-[#49443F] dark:text-[#E0DFE3]" : "text-[#8B8379] dark:text-[#92939C]"}`}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-7 rounded-xl border border-[#E4D9CB] dark:border-[#39333A] bg-white dark:bg-[#20212A] p-3">
                      <div className="text-[8px] uppercase tracking-[.15em] text-[#9A9288]">Easy to read</div>
                      <div className="mt-1 flex items-end justify-between">
                        <span className="font-serif text-[1.45rem] text-[#55724D] dark:text-[#B5CE9E]">82</span>
                        <span className="text-[8px] text-[#8B8379] dark:text-[#A3A1AA] pb-1">Looking good</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#EBE8DF] dark:bg-[#343540] overflow-hidden mt-1">
                        <div className="h-full w-[82%] rounded-full bg-[#87A179]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 sm:-left-9 bottom-10 rounded-2xl border border-[#E6DCD0] dark:border-[#34313A] bg-white/95 dark:bg-[#1C1D25]/95 backdrop-blur px-4 py-3 shadow-lg -rotate-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#F6E8DF] dark:bg-[#3A2420] text-[#C84B31]"><BookOpen className="w-4 h-4" /></span>
                  <span><span className="block text-[9px] uppercase tracking-wider text-[#969087]">Your finished work</span><span className="block text-[11px] font-semibold mt-0.5">Saved to My articles</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="what-you-can-do" className="relative bg-white dark:bg-[#111218] border-y border-[#E9E3DA] dark:border-[#252630]">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#C84B31]">A little help, all the way through</div>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight">From first thought to final page.</h2>
            </div>
            <p className="max-w-[410px] text-sm leading-7 text-[#6C665F] dark:text-[#A7A8B2]">No blank-page panic. No complicated tools. Just a thoughtful set of steps that takes your idea somewhere good.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="group rounded-[22px] border border-[#E9E3DA] dark:border-[#282A34] bg-[#FCFAF7] dark:bg-[#171820] p-6 sm:p-7 hover:-translate-y-1 hover:shadow-[0_16px_42px_rgba(38,31,24,.08)] transition-all">
                  <div className="flex items-start justify-between">
                    <span className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#F5E8DF] dark:bg-[#35231F] text-[#C84B31]"><Icon className="w-5 h-5" /></span>
                    <span className="font-mono text-[10px] text-[#AAA298]">0{index + 1}</span>
                  </div>
                  <div className="mt-7 text-[9px] uppercase tracking-[.18em] font-semibold text-[#C84B31]">{feature.eyebrow}</div>
                  <h3 className="mt-2 font-serif text-[1.55rem] leading-tight">{feature.title}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-[#706A63] dark:text-[#A7A8B2]">{feature.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="max-w-[1320px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-20 items-center">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#C84B31]">Simple from the start</div>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight">Four easy steps.<br /><span className="italic text-[#A65C45] dark:text-[#E18A70]">A finished article.</span></h2>
            <p className="mt-4 text-sm leading-7 text-[#706A63] dark:text-[#A7A8B2]">You stay in charge of every word. We simply help you get there faster and keep your work safe along the way.</p>
            <Link href="/register?next=%2Fstudio" className="mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-[#C84B31] hover:gap-3 transition-all">Start writing for free <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="rounded-[24px] border border-[#E7DED3] dark:border-[#2B2A32] bg-[#F4F0E9] dark:bg-[#171820] p-4 sm:p-7">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl bg-white dark:bg-[#20212A] border border-[#EEE8E0] dark:border-[#2B2C37] px-4 py-4">
                  <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-mono text-xs font-semibold ${index === 3 ? "bg-[#C84B31] text-white" : "bg-[#F5E8DF] dark:bg-[#35231F] text-[#C84B31]"}`}>0{index + 1}</span>
                  <span className="flex-1 text-sm font-medium">{step}</span>
                  {index === 3 ? <ArrowRight className="w-4 h-4 text-[#C84B31]" /> : <Check className="w-4 h-4 text-[#73906A]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-16 sm:pb-20">
        <div className="max-w-[1320px] mx-auto overflow-hidden relative rounded-[28px] bg-[#25201D] dark:bg-[#1A1719] px-7 sm:px-12 py-11 sm:py-14 text-white">
          <div className="absolute -right-20 -top-40 w-[420px] h-[420px] rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-24 w-[300px] h-[300px] rounded-full border border-white/10" />
          <div className="absolute right-[16%] bottom-[-80px] w-48 h-48 rounded-full bg-[#C84B31]/35 blur-3xl" />
          <div className="relative max-w-[660px]">
            <div className="text-[10px] uppercase tracking-[.22em] text-[#F2A58D] font-semibold">Your idea is worth writing down</div>
            <h2 className="mt-3 font-serif text-3xl sm:text-[2.7rem] leading-[1.05] tracking-tight">The next story starts with you.</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">Create your account and start writing today. Your articles are saved automatically as you go.</p>
            <Link href="/register?next=%2Fstudio" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E76D4E] hover:bg-[#F07D60] text-white text-sm font-semibold transition-colors">I want to create an article <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E8E1D7] dark:border-[#252630]">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-[11px] text-[#827B72] dark:text-[#9699A3]">
          <span>© {new Date().getFullYear()} VerbaCraft — A little more room for good writing.</span>
          <span className="flex items-center gap-1.5"><ImageIcon aria-hidden="true" className="w-3 h-3" /> Drafts, pictures and links together in one place.</span>
        </div>
      </footer>
    </main>
  );
}
