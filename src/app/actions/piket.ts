"use server";

import { revalidatePath } from "next/cache";
import { requireEdit } from "@/lib/auth-helpers";
import { formatMembers } from "@/lib/piket";
import type { PiketSection } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

/** Board piket harian hanya untuk kebersihan. */
function parseSection(raw: string): PiketSection {
  const s = raw.trim().toLowerCase();
  if (s !== "kebersihan") {
    throw new Error(
      s === "keamanan"
        ? "Piket harian keamanan diganti modul Log Keamanan"
        : "Section piket tidak valid",
    );
  }
  return "kebersihan";
}

function revalidatePiket() {
  revalidatePath("/dashboard/piket/kebersihan");
  revalidatePath("/jadwal");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

async function assertGroupSection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  groupId: string,
  section: PiketSection,
) {
  const { data, error } = await supabase
    .from("piket_groups")
    .select("id, section")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.section !== section) {
    throw new Error("Kelompok piket tidak ditemukan");
  }
}

/** Update anggota slot hari (anggota tetap, bukan rotasi). */
export async function updatePiketMembers(formData: FormData) {
  const section = parseSection(String(formData.get("section") || ""));
  await requireEdit("piket-kebersihan");
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  if (!groupId) throw new Error("ID kelompok wajib");

  await assertGroupSection(supabase, groupId, section);

  // members[] dari multi checkbox, atau string koma
  const fromList = formData
    .getAll("members")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const fromText = String(formData.get("membersText") || "");
  const names = fromList.length > 0 ? fromList : fromText.split(",");
  const members = formatMembers(names);

  const { error } = await supabase
    .from("piket_groups")
    .update({ members })
    .eq("id", groupId);
  if (error) throw new Error(error.message);

  revalidatePiket();
}

/** Tambah template tugas permanen untuk hari tersebut. */
export async function addPiketTask(formData: FormData) {
  const section = parseSection(String(formData.get("section") || ""));
  await requireEdit("piket-kebersihan");
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const taskLabel = String(formData.get("taskLabel") || "").trim();
  if (!groupId || !taskLabel) throw new Error("Data tidak lengkap");

  await assertGroupSection(supabase, groupId, section);

  const { count } = await supabase
    .from("piket_task_defs")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  const { error } = await supabase.from("piket_task_defs").upsert(
    {
      group_id: groupId,
      task_label: taskLabel,
      sort_order: count ?? 0,
    },
    { onConflict: "group_id,task_label" },
  );
  if (error) throw new Error(error.message);

  revalidatePiket();
}

/** Hapus template tugas (+ checks label sama di semua tanggal). */
export async function deletePiketTask(formData: FormData) {
  const section = parseSection(String(formData.get("section") || ""));
  await requireEdit("piket-kebersihan");
  const supabase = await createClient();

  const taskId = String(formData.get("taskId") || "").trim();
  if (!taskId) throw new Error("ID tugas wajib");

  const { data: def, error: defErr } = await supabase
    .from("piket_task_defs")
    .select("id, group_id, task_label")
    .eq("id", taskId)
    .maybeSingle();
  if (defErr) throw new Error(defErr.message);
  if (!def) throw new Error("Tugas tidak ditemukan");

  await assertGroupSection(supabase, def.group_id, section);

  await supabase
    .from("piket_checks")
    .delete()
    .eq("group_id", def.group_id)
    .eq("task_label", def.task_label);

  const { error } = await supabase
    .from("piket_task_defs")
    .delete()
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePiket();
}

/**
 * Toggle status selesai tugas template untuk **hari ini**.
 * form: section, groupId, taskLabel, done ("true"|"false" = current)
 */
export async function togglePiketCheck(formData: FormData) {
  const section = parseSection(String(formData.get("section") || ""));
  const profile = await requireEdit("piket-kebersihan");
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const taskLabel = String(formData.get("taskLabel") || "").trim();
  const currentlyDone = String(formData.get("done") || "") === "true";
  const checkId = String(formData.get("id") || "").trim();

  if (!groupId || !taskLabel) throw new Error("Data tidak lengkap");
  await assertGroupSection(supabase, groupId, section);

  const nextDone = !currentlyDone;
  const today = new Date().toISOString().slice(0, 10);

  if (checkId) {
    const { error } = await supabase
      .from("piket_checks")
      .update({
        done: nextDone,
        checked_by: nextDone ? profile.id : null,
      })
      .eq("id", checkId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("piket_checks").upsert(
      {
        group_id: groupId,
        date: today,
        task_label: taskLabel,
        done: nextDone,
        checked_by: nextDone ? profile.id : null,
      },
      { onConflict: "group_id,date,task_label" },
    );
    if (error) throw new Error(error.message);
  }

  revalidatePiket();
}
