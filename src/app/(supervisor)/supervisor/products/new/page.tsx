import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";
import ProductCreateClient from "./ProductCreateClient";

export default async function ProductCreatePage() {
  if (!(await isSupervisorAuthed())) redirect("/supervisor/login");
  return <ProductCreateClient />;
}
