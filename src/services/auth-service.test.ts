import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth-service";

const fakeUser = {
  id: "user_1",
  name: "Kaio",
  email: "kaio@example.com",
  passwordHash: "",
  createdAt: new Date(),
};

function makeRepoMock() {
  return {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  };
}

describe("AuthService", () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new AuthService(repo as any);
  });

  it("registers a new user with a hashed password", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockImplementation(async (data: any) => ({
      ...fakeUser,
      ...data,
    }));

    const result = await service.register({
      name: "Kaio",
      email: "kaio@example.com",
      password: "secret123",
    });

    expect(result).toEqual({ id: "user_1", name: "Kaio", email: "kaio@example.com" });
    expect(repo.create).toHaveBeenCalledTimes(1);
    const createArg = repo.create.mock.calls[0][0];
    expect(createArg.passwordHash).not.toBe("secret123");
  });

  it("rejects registration with a duplicate email", async () => {
    repo.findByEmail.mockResolvedValue(fakeUser);

    await expect(
      service.register({ name: "Kaio", email: "kaio@example.com", password: "x" })
    ).rejects.toThrow("EMAIL_TAKEN");
  });

  it("logs in with correct credentials and returns a token", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const passwordHash = await hashPassword("secret123");
    repo.findByEmail.mockResolvedValue({ ...fakeUser, passwordHash });

    const result = await service.login({ email: "kaio@example.com", password: "secret123" });

    expect(result.user).toEqual({ id: "user_1", name: "Kaio", email: "kaio@example.com" });
    expect(typeof result.token).toBe("string");
  });

  it("rejects login with wrong password", async () => {
    const { hashPassword } = await import("@/lib/auth");
    const passwordHash = await hashPassword("secret123");
    repo.findByEmail.mockResolvedValue({ ...fakeUser, passwordHash });

    await expect(
      service.login({ email: "kaio@example.com", password: "wrong" })
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });
});
