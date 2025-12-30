import type { ReactNode } from "react";
import AppShell from "./_components/AppShell";
import { getSupervisorAccountNameFromToken } from "@/lib/auth/user";

export default async function SupervisorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const accountName = await getSupervisorAccountNameFromToken();

  return <AppShell accountName={accountName}>{children}</AppShell>;
}
