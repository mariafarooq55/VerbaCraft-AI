"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Feather,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./ThemeProvider";

type AuthMode = "login" | "register";

export function AuthPage({
  mode,
  destination = "/studio",
}: {
  mode: AuthMode;
  destination?: string;
}) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const safeDestination =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/studio";

  const nextParam = encodeURIComponent(safeDestination);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isRegister && !acceptedTerms) {
      setError(
        "Please confirm that you agree to keep your sign-in details private.",
      );
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "We couldn't sign you in. Please try again.");
        return;
      }

      router.replace(safeDestination);
      router.refresh();
    } catch {
      setError(
        "We couldn't reach the sign-in page. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] dark:bg-[#0C0D10] text-[#18181B] dark:text-[#F4F4F6] grid grid-cols-1 lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden lg:flex min-h-screen flex-col justify-between overflow-hidden bg-[#25201D] text-white px-10 xl:px-16 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_20%,rgba(195,91,62,.36),transparent_40%),radial-gradient(ellipse_at_86%_84%,rgba(128,145,104,.26),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[.08] [background-image:radial-gradient(#fff_0.65px,transparent_0.65px)] [background-size:18px_18px]" />
        <div className="absolute top-[21%] right-[-130px] w-[450px] h-[450px] rounded-full border border-white/10" />
        <div className="absolute top-[25%] right-[-82px] w-[350px] h-[350px] rounded-full border border-white/10" />
        <div className="absolute top-[33%] right-[-18px] w-[220px] h-[220px] rounded-full border border-white/10" />

        <Link href="/" className="relative z-10 flex items-center gap-3 w-fit">
          <span className="w-10 h-10 rounded-[14px] bg-[#D75D3E] flex items-center justify-center">
            <Feather className="w-5 h-5" />
          </span>
          <span>
            <span className="block font-serif text-xl font-bold leading-5">
              VerbaCraft
            </span>
            <span className="block mt-1 text-[9px] uppercase tracking-[.24em] text-white/50">
              Your writing studio
            </span>
          </span>
        </Link>

        <div className="relative z-10 max-w-[570px] pb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[10px] uppercase tracking-[.17em] text-[#F2B5A0]">
            <Sparkles className="w-3 h-3" /> A calmer way to write
          </span>

          <h1 className="mt-6 font-serif text-5xl xl:text-[4.4rem] leading-[.98] tracking-[-.04em] font-medium">
            Good ideas
            <br />
            deserve to be
            <br />
            <span className="italic text-[#F28B6D]">well said.</span>
          </h1>

          <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-white/65">
            Pick up where you left off, keep every finished article close, and
            turn your next thought into something worth sharing.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-3 max-w-[470px]">
            {[
              "Your articles stay saved",
              "Your own words stay yours",
              "Photos and links in one place",
              "Download whenever you need",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[.045] px-3 py-3"
              >
                <span className="w-5 h-5 shrink-0 rounded-full bg-[#78906B]/25 text-[#BBD2AC] flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-[11px] leading-5 text-white/75">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40">
          <span>Write a little. Make it yours.</span>
          <span>Light and dark mode included</span>
        </div>
      </section>

      <section className="min-h-screen flex flex-col px-5 sm:px-8 py-5 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#6D665F] dark:text-[#A7A8B2] hover:text-[#C84B31] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <div className="flex items-center gap-2">
            <span className="lg:hidden inline-flex items-center gap-2 mr-1 font-serif font-bold text-sm">
              <Feather className="w-4 h-4 text-[#C84B31]" /> VerbaCraft
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[430px]">
            <div className="w-12 h-12 rounded-2xl bg-[#F5E8DF] dark:bg-[#35231F] text-[#C84B31] dark:text-[#E57459] flex items-center justify-center">
              {isRegister ? (
                <Feather className="w-5 h-5" />
              ) : (
                <LockKeyhole className="w-5 h-5" />
              )}
            </div>

            <div className="mt-6 text-[10px] uppercase tracking-[.2em] text-[#C84B31] font-semibold">
              {isRegister ? "A fresh page" : "Welcome back"}
            </div>

            <h2 className="mt-2 font-serif text-3xl sm:text-[2.5rem] font-semibold tracking-tight">
              {isRegister ? "Create your account" : "Sign in to your studio"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#716A63] dark:text-[#A7A8B2]">
              {isRegister
                ? "Set up an account to start writing and keep your articles together."
                : "Your writing desk is ready when you are."}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {isRegister && (
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-1.5 text-xs font-semibold text-[#37332F] dark:text-[#E0DFE3]"
                  >
                    Your name
                  </label>
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={70}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we address you?"
                    className="w-full rounded-xl border border-[#DED7CD] dark:border-[#343540] bg-white dark:bg-[#171820] px-4 py-3 text-sm outline-none placeholder:text-[#AAA39A] dark:placeholder:text-[#747783] focus:border-[#C84B31] dark:focus:border-[#E57459] focus:ring-4 focus:ring-[#C84B31]/10 transition-all"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block mb-1.5 text-xs font-semibold text-[#37332F] dark:text-[#E0DFE3]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#DED7CD] dark:border-[#343540] bg-white dark:bg-[#171820] px-4 py-3 text-sm outline-none placeholder:text-[#AAA39A] dark:placeholder:text-[#747783] focus:border-[#C84B31] dark:focus:border-[#E57459] focus:ring-4 focus:ring-[#C84B31]/10 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block mb-1.5 text-xs font-semibold text-[#37332F] dark:text-[#E0DFE3]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    required
                    minLength={isRegister ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isRegister ? "At least 8 characters" : "Your password"
                    }
                    className="w-full rounded-xl border border-[#DED7CD] dark:border-[#343540] bg-white dark:bg-[#171820] px-4 py-3 pr-12 text-sm outline-none placeholder:text-[#AAA39A] dark:placeholder:text-[#747783] focus:border-[#C84B31] dark:focus:border-[#E57459] focus:ring-4 focus:ring-[#C84B31]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#8A8279] dark:text-[#9295A1] hover:bg-[#F4F0EA] dark:hover:bg-[#252631]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {isRegister && (
                  <p className="mt-1.5 text-[11px] text-[#898178] dark:text-[#9295A1]">
                    Use at least 8 characters. A longer phrase is easier to
                    remember.
                  </p>
                )}
              </div>

              {isRegister && (
                <label className="flex items-start gap-2.5 text-xs leading-5 text-[#69635D] dark:text-[#A7A8B2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 accent-[#C84B31]"
                  />
                  <span>
                    I will keep my sign-in details private and use this account
                    for my own writing.
                  </span>
                </label>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3.5 py-3 text-xs leading-5 text-red-800 dark:text-red-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#C84B31] hover:bg-[#AD3D26] disabled:opacity-60 text-white px-5 py-3.5 text-sm font-semibold shadow-[0_8px_20px_rgba(160,62,38,.16)] transition-all"
              >
                <span>
                  {busy
                    ? "One moment…"
                    : isRegister
                      ? "Create account"
                      : "Sign in"}
                </span>
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#6F6962] dark:text-[#A7A8B2]">
              {isRegister ? "Already have an account?" : "New to VerbaCraft?"}{" "}
              <Link
                href={`/${isRegister ? "login" : "register"}?next=${nextParam}`}
                className="font-semibold text-[#C84B31] dark:text-[#E57459] hover:underline underline-offset-4"
              >
                {isRegister ? "Sign in" : "Create an account"}
              </Link>
            </div>

            <div className="mt-8 pt-5 border-t border-[#E7E1D8] dark:border-[#282A34] flex items-center justify-center gap-2 text-[10px] text-[#8D857C] dark:text-[#9295A1]">
              <LockKeyhole className="w-3.5 h-3.5" />
              Your password is protected. Your saved articles belong to your
              account.
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-[#9A938A] dark:text-[#777B88]">
          A little more room for good writing.
        </div>
      </section>
    </main>
  );
}
