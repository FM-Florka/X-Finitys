import { PengurusClient } from "@/app/dashboard/pengurus/PengurusClient";
import { requireEdit } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengurus" };

export default async function PengurusPage() {
  const me = await requireEdit("pengurus");
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("name", { ascending: true });

  const users = (data ?? []) as Profile[];

  return <PengurusClient users={users} currentUserId={me.id} />;
}
