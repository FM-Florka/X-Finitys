import { requireView } from "@/lib/auth-helpers";
import { canDeleteAnyMateri, canEdit } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Material } from "@/lib/types";
import { MateriClient } from "./MateriClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Materi" };

export default async function MateriPage() {
  const profile = await requireView("materi");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("*, uploader:profiles!uploaded_by(name, role)")
    .order("created_at", { ascending: false })
    .limit(200);

  const materials = (data ?? []) as Material[];

  return (
    <MateriClient
      materials={materials}
      currentUserId={profile.id}
      canUpload={canEdit(profile.role, "materi")}
      canDeleteAny={canDeleteAnyMateri(profile.role)}
      loadError={error?.message ?? null}
    />
  );
}
