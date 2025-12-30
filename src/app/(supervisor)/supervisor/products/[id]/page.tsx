import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";
import ProductEditClient from "./ProductEditClient";

export default async function ProductEditPage() {
  if (!(await isSupervisorAuthed())) redirect("/supervisor/login");
  return <ProductEditClient />;
}
