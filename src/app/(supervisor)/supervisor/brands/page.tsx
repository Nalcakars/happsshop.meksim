import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";
import BrandsClient from "./BrandsClient";

export default async function BrandsPage() {
  if (!(await isSupervisorAuthed())) {
    redirect("/supervisor/login");
  }

  return <BrandsClient />;
}
