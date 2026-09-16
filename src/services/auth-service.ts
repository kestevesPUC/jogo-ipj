import { hashPassword, verifyPassword, signToken } from "@/lib/auth";
import { userRepository, UserRepository } from "@/repositories/user-repository";

export class AuthService {
  constructor(private repo: Pick<UserRepository, "findByEmail" | "create"> = userRepository) {}

  async register(input: { name: string; email: string; password: string }) {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return { id: user.id, name: user.name, email: user.email };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }
    const token = signToken({ userId: user.id });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }
}

export const authService = new AuthService();
