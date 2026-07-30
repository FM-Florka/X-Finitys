import { redirect } from "next/navigation";

/** Legacy route — ganti total ke /dashboard/keamanan (log internal). */
export default function LegacyPiketKeamananRedirect() {
  redirect("/dashboard/keamanan");
}
