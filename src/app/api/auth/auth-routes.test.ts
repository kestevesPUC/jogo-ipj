import { describe, it, expect, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as registerHandler } from "./register/route";
import { POST as loginHandler } from "./login/route";
import { GET as meHandler } from "./me/route";

function jsonRequest(body: unknown, cookie?: string) {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("auth routes", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: "routetest@example.com" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers, logs in, and reads the session", async () => {
    const registerRes = await registerHandler(
      jsonRequest({ name: "Route Test", email: "routetest@example.com", password: "secret123" })
    );
    expect(registerRes.status).toBe(201);

    const loginRes = await loginHandler(
      jsonRequest({ email: "routetest@example.com", password: "secret123" })
    );
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const cookiePair = setCookie.split(";")[0];

    const meRes = await meHandler(
      new Request("http://localhost/api/auth/me", { headers: { cookie: cookiePair } })
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe("routetest@example.com");
  });

  it("rejects /me without a session cookie", async () => {
    const res = await meHandler(new Request("http://localhost/api/auth/me"));
    expect(res.status).toBe(401);
  });
});
