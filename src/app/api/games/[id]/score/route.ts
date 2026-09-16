import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { adjustScoreSchema } from "@/dtos/gameplay-dto";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = adjustScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const team = await gameplayService.adjustScore(
      session.userId,
      params.id,
      parsed.data.teamId,
      parsed.data.delta
    );
    return NextResponse.json({ team });
  } catch (err) {
    if (err instanceof Error && (err.message === "TEAM_NOT_FOUND" || err.message === "GAME_NOT_FOUND")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
