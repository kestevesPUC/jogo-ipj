import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { userRepository } from "@/repositories/user-repository";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const user = await userRepository.findById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
