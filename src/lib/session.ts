import { verifyToken } from "@/lib/auth";

export const SESSION_COOKIE = "quiz_session";

export async function requireUser(request: Request): Promise<{ userId: string } | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));

  if (!match) return null;

  const token = decodeURIComponent(match.split("=")[1]);
  const payload = verifyToken(token);
  if (!payload) return null;

  return { userId: payload.userId };
}
