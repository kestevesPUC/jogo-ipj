import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { themeService } from "@/services/theme-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const theme = await themeService.getOwned(session.userId, params.id);
    return NextResponse.json({ theme });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await themeService.remove(session.userId, params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}
