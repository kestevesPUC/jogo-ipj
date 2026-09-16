import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string; blockId: string } }
) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let activeTeamId: string | undefined;
  try {
    const body = await request.json();
    activeTeamId = typeof body?.activeTeamId === "string" ? body.activeTeamId : undefined;
  } catch {
    activeTeamId = undefined;
  }

  try {
    const block = await gameplayService.revealBlock(session.userId, params.id, params.blockId, activeTeamId);
    return NextResponse.json({ block });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "BLOCK_NOT_FOUND" || err.message === "GAME_NOT_FOUND" || err.message === "TEAM_NOT_FOUND")
    ) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
