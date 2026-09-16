import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth";

describe("auth lib", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("signs and verifies a JWT", () => {
    const token = signToken({ userId: "abc123" });
    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe("abc123");
  });

  it("returns null for an invalid token", () => {
    expect(verifyToken("not-a-real-token")).toBeNull();
  });
});
