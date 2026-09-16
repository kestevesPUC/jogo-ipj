import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const game = await gameplayService.finish(session.userId, params.id);
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
  }
}
