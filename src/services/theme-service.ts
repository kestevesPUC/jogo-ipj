import { themeRepository, ThemeRepository } from "@/repositories/theme-repository";

export class ThemeService {
  constructor(private repo: ThemeRepository = themeRepository) {}

  list(ownerId: string) {
    return this.repo.findAllByOwner(ownerId);
  }

  create(ownerId: string, name: string) {
    return this.repo.create({ name, ownerId });
  }

  async getOwned(ownerId: string, themeId: string) {
    const theme = await this.repo.findByIdAndOwner(themeId, ownerId);
    if (!theme) {
      throw new Error("THEME_NOT_FOUND");
    }
    return theme;
  }

  async remove(ownerId: string, themeId: string) {
    await this.getOwned(ownerId, themeId);
    await this.repo.delete(themeId);
  }
}

export const themeService = new ThemeService();
