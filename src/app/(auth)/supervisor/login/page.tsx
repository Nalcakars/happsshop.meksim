import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";
import LoginClient from "./LoginClient";

export default async function SupervisorLoginPage() {
  if (await isSupervisorAuthed()) {
    redirect("/supervisor");
  }

  return <LoginClient />;
}
