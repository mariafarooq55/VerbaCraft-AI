import { redirect } from "next/navigation";
import { PublicLanding } from "@/components/PublicLanding";
import { VerbaCraftStudio } from "@/components/VerbaCraftStudio";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <PublicLanding />;
  return <VerbaCraftStudio currentUser={user} />;
}
