import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { questionSchema } from "@/dtos/question-dto";
import { questionService } from "@/services/question-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const questions = await questionService.listByTheme(session.userId, params.id);
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await questionService.create(session.userId, params.id, parsed.data);
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "THEME_QUESTION_LIMIT") {
      return NextResponse.json({ error: "THEME_QUESTION_LIMIT" }, { status: 422 });
    }
    if (err instanceof Error && err.message === "THEME_NOT_FOUND") {
      return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
