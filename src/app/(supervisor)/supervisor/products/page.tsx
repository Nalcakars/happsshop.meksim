import { redirect } from "next/navigation";
import { isSupervisorAuthed } from "@/lib/auth/session";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  if (!(await isSupervisorAuthed())) redirect("/supervisor/login");
  return <ProductsClient />;
}
