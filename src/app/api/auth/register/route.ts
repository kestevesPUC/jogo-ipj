import { NextResponse } from "next/server";
import { registerSchema } from "@/dtos/auth-dto";
import { authService } from "@/services/auth-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await authService.register(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
