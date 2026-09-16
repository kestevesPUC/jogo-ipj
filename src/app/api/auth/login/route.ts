import { NextResponse } from "next/server";
import { loginSchema } from "@/dtos/auth-dto";
import { authService } from "@/services/auth-service";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { token, user } = await authService.login(parsed.data);
    const response = NextResponse.json({ user }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
