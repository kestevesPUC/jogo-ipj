import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeService } from "./theme-service";

function makeRepoMock() {
  return {
    findAllByOwner: vi.fn(),
    findByIdAndOwner: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    countQuestions: vi.fn(),
  };
}

describe("ThemeService", () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let service: ThemeService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new ThemeService(repo as any);
  });

  it("lists themes for an owner", async () => {
    repo.findAllByOwner.mockResolvedValue([{ id: "t1" }]);
    const result = await service.list("user_1");
    expect(result).toEqual([{ id: "t1" }]);
    expect(repo.findAllByOwner).toHaveBeenCalledWith("user_1");
  });

  it("creates a theme for the owner", async () => {
    repo.create.mockResolvedValue({ id: "t1", name: "Gênesis", ownerId: "user_1" });
    const result = await service.create("user_1", "Gênesis");
    expect(repo.create).toHaveBeenCalledWith({ name: "Gênesis", ownerId: "user_1" });
    expect(result.id).toBe("t1");
  });

  it("throws THEME_NOT_FOUND when the theme doesn't belong to the owner", async () => {
    repo.findByIdAndOwner.mockResolvedValue(null);
    await expect(service.getOwned("user_1", "t1")).rejects.toThrow("THEME_NOT_FOUND");
  });

  it("returns the theme when owned", async () => {
    repo.findByIdAndOwner.mockResolvedValue({ id: "t1", ownerId: "user_1" });
    const result = await service.getOwned("user_1", "t1");
    expect(result.id).toBe("t1");
  });

  it("removes an owned theme", async () => {
    repo.findByIdAndOwner.mockResolvedValue({ id: "t1", ownerId: "user_1" });
    repo.delete.mockResolvedValue({ id: "t1" });
    await service.remove("user_1", "t1");
    expect(repo.delete).toHaveBeenCalledWith("t1");
  });
});
