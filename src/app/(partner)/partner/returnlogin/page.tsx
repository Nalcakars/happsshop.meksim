import ReturnLoginClient from "./ReturnLoginClient";

export const dynamic = "force-dynamic";

export default async function PartnerReturnLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp?.token ?? "").trim();

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <ReturnLoginClient token={token} />
    </div>
  );
}
