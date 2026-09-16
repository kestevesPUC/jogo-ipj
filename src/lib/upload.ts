import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUploadedFile(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const originalExt = path.extname(file.name) || "";
  const fileName = `${randomUUID()}${originalExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return `/uploads/${fileName}`;
}
