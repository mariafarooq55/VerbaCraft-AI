import { redirect } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function safeDestination(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/studio";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  if (await getCurrentUser()) redirect("/studio");
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  return <AuthPage mode="register" destination={safeDestination(next)} />;
}
