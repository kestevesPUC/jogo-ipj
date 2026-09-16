import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { createThemeSchema } from "@/dtos/theme-dto";
import { themeService } from "@/services/theme-service";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const themes = await themeService.list(session.userId);
  return NextResponse.json({ themes });
}

export async function POST(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = createThemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  const theme = await themeService.create(session.userId, parsed.data.name);
  return NextResponse.json({ theme }, { status: 201 });
}
