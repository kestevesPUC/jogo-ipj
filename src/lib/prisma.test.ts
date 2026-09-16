import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./prisma";

describe("prisma client", () => {
  it("connects and can run a raw query", async () => {
    const result = await prisma.$queryRawUnsafe<{ result: number | bigint }[]>(
      "SELECT 1 as result"
    );
    expect(Number(result[0].result)).toBe(1);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
