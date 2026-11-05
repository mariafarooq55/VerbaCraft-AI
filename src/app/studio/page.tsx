import { redirect } from "next/navigation";
import { VerbaCraftStudio } from "@/components/VerbaCraftStudio";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fstudio");
  return <VerbaCraftStudio currentUser={user} />;
}
