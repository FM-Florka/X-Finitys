import { redirect } from "next/navigation";

/** Root: no public landing — always go to login. */
export default function HomePage() {
  redirect("/login");
}
