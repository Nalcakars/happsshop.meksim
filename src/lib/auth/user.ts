import { getAccessToken } from "@/lib/auth/session";

type JwtPayload = {
  name?: string;
  email?: string;
  exp?: number;
  [k: string]: any;
};

// base64url decode
function b64urlDecode(input: string) {
  const pad = 4 - (input.length % 4);
  const base64 = (input + "=".repeat(pad === 4 ? 0 : pad))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(b64urlDecode(payload));
  } catch {
    return null;
  }
}

/**
 * Server-side: httpOnly cookie'deki access token'dan accountName okumak için.
 * JWT içinde senin API'nin ürettiği "name" claim'i var (ör: dogusspaadmin).
 */
export async function getSupervisorAccountNameFromToken(): Promise<
  string | null
> {
  const token = await getAccessToken();
  if (!token) return null;

  const payload = parseJwt(token);
  const name = payload?.name;

  return typeof name === "string" && name.trim().length ? name : null;
}
