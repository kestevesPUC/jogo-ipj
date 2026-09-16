import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { questionSchema } from "@/dtos/question-dto";
import { questionService } from "@/services/question-service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = questionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await questionService.update(session.userId, params.id, parsed.data);
    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await questionService.remove(session.userId, params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }
}
