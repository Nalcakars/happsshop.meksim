import { cookies } from "next/headers";

const ACCESS_COOKIE = "hs_supervisor_at";
const REFRESH_COOKIE = "hs_supervisor_rt";

const isProd = process.env.NODE_ENV === "production";

function toDateSafe(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}) {
  const jar = await cookies();

  const accessExpires = toDateSafe(params.accessTokenExpiresAt);
  const refreshExpires = toDateSafe(params.refreshTokenExpiresAt);

  jar.set(ACCESS_COOKIE, params.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    ...(accessExpires ? { expires: accessExpires } : {}),
  });

  jar.set(REFRESH_COOKIE, params.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    ...(refreshExpires ? { expires: refreshExpires } : {}),
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();

  jar.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    secure: isProd,
    sameSite: "lax",
  });

  jar.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    secure: isProd,
    sameSite: "lax",
  });
}

export async function getAccessToken() {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value ?? null;
}

/**
 * 🔐 SERVER SAFE auth check
 * - refresh çağırmaz
 * - sadece access token var mı bakar
 */
export async function isSupervisorAuthed() {
  const at = await getAccessToken();
  return !!at;
}
