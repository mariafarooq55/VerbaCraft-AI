import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerbaCraft — Your Friendly Article Writing Studio",
  description:
    "Turn your idea into a finished article. Get help with titles, a first draft, natural-sounding edits, and downloadable PDF, Word, HTML and text files.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-screen bg-[#FAF8F5] dark:bg-[#0C0D10] text-[#18181B] dark:text-[#F4F4F6] font-sans antialiased selection:bg-[#C84B31]/20 selection:text-[#9A341E] dark:selection:bg-[#E06348]/30 dark:selection:text-white transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
