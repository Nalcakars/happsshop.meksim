import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";

export default async function SupervisorHome() {
  if (!(await isSupervisorAuthed())) {
    redirect("/supervisor/login");
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Doğuş SPA Reçete Sistemine Hoş Geldiniz
        </h1>
      </div>
    </>
  );
}
