import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { createGameSchema } from "@/dtos/game-dto";
import { gameService } from "@/services/game-service";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "draft" | "in_progress" | "finished" | null;
  const games = await gameService.listByOwner(session.userId, status ?? undefined);
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const game = await gameService.create(session.userId, parsed.data);
    return NextResponse.json({ game }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_ENOUGH_QUESTIONS") {
      return NextResponse.json({ error: "NOT_ENOUGH_QUESTIONS" }, { status: 422 });
    }
    if (err instanceof Error && err.message === "THEME_NOT_FOUND") {
      return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
