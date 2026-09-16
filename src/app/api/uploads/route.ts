import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const url = await saveUploadedFile(file);
  return NextResponse.json({ url }, { status: 201 });
}
