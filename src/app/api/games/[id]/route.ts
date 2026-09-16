import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameService } from "@/services/game-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const game = await gameService.getOwned(session.userId, params.id);
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
  }
}
