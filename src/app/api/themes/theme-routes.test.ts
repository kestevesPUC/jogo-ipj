import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";
import { GET as listThemes, POST as createTheme } from "./route";
import { GET as getTheme, DELETE as deleteTheme } from "./[id]/route";

let userId: string;
let cookie: string;

describe("theme routes", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: "Theme Tester", email: "themetester@example.com", passwordHash: "x" },
    });
    userId = user.id;
    cookie = `${SESSION_COOKIE}=${signToken({ userId })}`;
  });

  afterAll(async () => {
    await prisma.theme.deleteMany({ where: { ownerId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("creates, lists, fetches, and deletes a theme scoped to the owner", async () => {
    const createRes = await createTheme(
      new Request("http://localhost/api/themes", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ name: "Livro de Gênesis" }),
      })
    );
    expect(createRes.status).toBe(201);
    const { theme } = await createRes.json();

    const listRes = await listThemes(new Request("http://localhost/api/themes", { headers: { cookie } }));
    const { themes } = await listRes.json();
    expect(themes.some((t: any) => t.id === theme.id)).toBe(true);

    const getRes = await getTheme(
      new Request(`http://localhost/api/themes/${theme.id}`, { headers: { cookie } }),
      { params: { id: theme.id } }
    );
    expect(getRes.status).toBe(200);

    const deleteRes = await deleteTheme(
      new Request(`http://localhost/api/themes/${theme.id}`, { method: "DELETE", headers: { cookie } }),
      { params: { id: theme.id } }
    );
    expect(deleteRes.status).toBe(200);
  });
});
