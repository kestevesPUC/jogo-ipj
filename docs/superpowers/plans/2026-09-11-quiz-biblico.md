# Quiz Bíblico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, single-screen web app for running a Bible-quiz competition (Baamboozle-style numbered block grid), with theme-based reusable question banks, JWT auth, manual scoring, and game history.

**Architecture:** Next.js (App Router) full-stack app. Layered backend: API routes (controllers) → services (business rules) → repositories (only layer touching Prisma) → SQLite via Prisma. React UI consumes the API routes. Runs locally via `npm run dev`.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma + SQLite, bcrypt, jsonwebtoken, zod, Vitest for tests.

**Spec:** [docs/superpowers/specs/2026-09-11-quiz-biblico-design.md](../specs/2026-09-11-quiz-biblico-design.md)

## Global Constraints

- Node.js project using TypeScript throughout (no plain `.js` source files).
- SQLite database file lives at `prisma/dev.db`, schema changes only via `prisma migrate dev`.
- `JWT_SECRET` and any secrets live in `.env` (never committed — `.env` must be in `.gitignore`).
- Every Theme/Question/Game query is scoped to `ownerId = <logged-in user id>` — enforced in the repository or service layer, never left to the UI.
- Max 100 questions per theme; enforced in `QuestionService`, not just the UI.
- All API input validated with zod DTOs before reaching a service.
- Controllers contain no business logic; services never import Prisma directly or read `Request`/`Response`; repositories are the only files that `import { prisma }`.
- Uploaded media files are written under `public/uploads/` and referenced by relative path; URL-based media is stored as-is and never downloaded.
- Commit after every task using the message style in each task's final step.

---

### Task 1: Project scaffold, Prisma schema, and database

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `.env`, `.env.example`
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Test: `src/lib/prisma.test.ts`

**Interfaces:**
- Produces: `prisma` singleton client exported from `src/lib/prisma.ts` as `export const prisma: PrismaClient`. All later repositories import this.
- Produces: Prisma models `User`, `Theme`, `Question`, `Game`, `GameBlock`, `Team` (exact fields below) — every later task's repository/service relies on these field names and enum values.

- [ ] **Step 1: Initialize the Next.js + TypeScript project**

```bash
npx create-next-app@14 . --ts --app --eslint --src-dir --import-alias "@/*" --no-tailwind --use-npm
```

When prompted, accept defaults. This creates `package.json`, `tsconfig.json`, `next.config.mjs`, `src/app/`.

- [ ] **Step 2: Install backend dependencies**

```bash
npm install prisma @prisma/client bcrypt jsonwebtoken zod
npm install -D vitest @types/bcrypt @types/jsonwebtoken @vitest/ui
```

- [ ] **Step 3: Add `.env`, `.env.example`, and `.gitignore` entries**

`.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-only-change-me-for-production"
```

`.env.example`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-string"
```

Append to `.gitignore` (create the entries if the file doesn't already have them):
```
.env
/prisma/dev.db
/public/uploads/*
!/public/uploads/.gitkeep
```

Create `public/uploads/.gitkeep` as an empty file so the folder exists in git.

- [ ] **Step 4: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and a `.env` (merge with the one from Step 3 — keep both `DATABASE_URL` and `JWT_SECRET`).

- [ ] **Step 5: Write the full Prisma schema**

Replace `prisma/schema.prisma` contents with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  themes Theme[]
  games  Game[]
}

model Theme {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  createdAt DateTime @default(now())

  questions Question[]
  games     Game[]

  @@index([ownerId])
}

enum MediaType {
  none
  image
  gif
  video
}

enum MediaSource {
  upload
  url
}

model Question {
  id          String      @id @default(cuid())
  themeId     String
  theme       Theme       @relation(fields: [themeId], references: [id], onDelete: Cascade)
  prompt      String
  answer      String
  mediaType   MediaType   @default(none)
  mediaSource MediaSource?
  mediaValue  String?
  createdAt   DateTime    @default(now())

  gameBlocks GameBlock[]

  @@index([themeId])
}

enum GameStatus {
  draft
  in_progress
  finished
}

model Game {
  id                  String     @id @default(cuid())
  title               String
  ownerId             String
  owner               User       @relation(fields: [ownerId], references: [id])
  themeId             String
  theme               Theme      @relation(fields: [themeId], references: [id])
  questionCount       Int
  specialBlockPercent Int        @default(0)
  status              GameStatus @default(draft)
  createdAt           DateTime   @default(now())
  finishedAt          DateTime?

  blocks GameBlock[]
  teams  Team[]

  @@index([ownerId])
  @@index([themeId])
}

enum BlockType {
  question
  bonus_points
  lose_points
  skip_turn
}

model GameBlock {
  id          String    @id @default(cuid())
  gameId      String
  game        Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  position    Int
  type        BlockType
  questionId  String?
  question    Question? @relation(fields: [questionId], references: [id])
  pointsValue Int?
  revealed    Boolean   @default(false)

  @@index([gameId])
}

model Team {
  id     String @id @default(cuid())
  gameId String
  game   Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  name   String
  color  String
  score  Int    @default(0)

  @@index([gameId])
}
```

- [ ] **Step 6: Run the first migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/dev.db` and `prisma/migrations/<timestamp>_init/`, prints "Your database is now in sync with your schema."

- [ ] **Step 7: Create the Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 8: Configure Vitest**

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 9: Write a smoke test for the Prisma client**

Create `src/lib/prisma.test.ts`:

```typescript
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./prisma";

describe("prisma client", () => {
  it("connects and can run a raw query", async () => {
    const result = await prisma.$queryRawUnsafe<{ result: number }[]>(
      "SELECT 1 as result"
    );
    expect(result[0].result).toBe(1);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- src/lib/prisma.test.ts`
Expected: PASS (1 test)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Prisma/SQLite schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Auth library (hashing, JWT) and User repository/service

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/repositories/user-repository.ts`
- Create: `src/services/auth-service.ts`
- Test: `src/lib/auth.test.ts`
- Test: `src/services/auth-service.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` (Task 1).
- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>`, `signToken(payload: { userId: string }): string`, `verifyToken(token: string): { userId: string } | null` from `src/lib/auth.ts`.
- Produces: `UserRepository` class with `create(data: { name: string; email: string; passwordHash: string }): Promise<User>` and `findByEmail(email: string): Promise<User | null>` and `findById(id: string): Promise<User | null>`, exported from `src/repositories/user-repository.ts` as `export const userRepository = new UserRepository()`.
- Produces: `AuthService` with `register(input: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string }>` (throws `Error("EMAIL_TAKEN")` on duplicate) and `login(input: { email: string; password: string }): Promise<{ token: string; user: { id: string; name: string; email: string } }>` (throws `Error("INVALID_CREDENTIALS")`), exported from `src/services/auth-service.ts` as `export const authService = new AuthService()`. Later tasks (Task 3) import `authService`.

- [ ] **Step 1: Write failing tests for the auth lib**

Create `src/lib/auth.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/auth.test.ts`
Expected: FAIL (module `./auth` has no exported members)

- [ ] **Step 3: Implement the auth lib**

Create `src/lib/auth.ts`:

```typescript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me-for-production";
const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/auth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement the User repository**

Create `src/repositories/user-repository.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export class UserRepository {
  create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({ data });
  }

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}

export const userRepository = new UserRepository();
```

- [ ] **Step 6: Write failing tests for the AuthService**

Create `src/services/auth-service.test.ts`:

```typescript
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
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- src/services/auth-service.test.ts`
Expected: FAIL (module `./auth-service` has no exported member `AuthService`)

- [ ] **Step 8: Implement the AuthService**

Create `src/services/auth-service.ts`:

```typescript
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
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- src/services/auth-service.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add auth lib, user repository, and auth service

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Auth API routes, session cookie, and route-guard helper

**Files:**
- Create: `src/dtos/auth-dto.ts`
- Create: `src/lib/session.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Test: `src/app/api/auth/auth-routes.test.ts`

**Interfaces:**
- Consumes: `authService` (Task 2), `verifyToken` (Task 2).
- Produces: `requireUser(request: Request): Promise<{ userId: string } | null>` from `src/lib/session.ts` — every later API route (Themes, Questions, Games) calls this first to authorize.
- Produces: `SESSION_COOKIE = "quiz_session"` constant exported from `src/lib/session.ts`.

- [ ] **Step 1: Write the zod DTOs**

Create `src/dtos/auth-dto.ts`:

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Write the session helper**

Create `src/lib/session.ts`:

```typescript
import { verifyToken } from "@/lib/auth";

export const SESSION_COOKIE = "quiz_session";

export async function requireUser(request: Request): Promise<{ userId: string } | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));

  if (!match) return null;

  const token = decodeURIComponent(match.split("=")[1]);
  const payload = verifyToken(token);
  if (!payload) return null;

  return { userId: payload.userId };
}
```

- [ ] **Step 3: Implement the register route**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { registerSchema } from "@/dtos/auth-dto";
import { authService } from "@/services/auth-service";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await authService.register(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement the login route**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { loginSchema } from "@/dtos/auth-dto";
import { authService } from "@/services/auth-service";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { token, user } = await authService.login(parsed.data);
    const response = NextResponse.json({ user }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement the logout route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
```

- [ ] **Step 6: Implement the "me" route**

Create `src/app/api/auth/me/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { userRepository } from "@/repositories/user-repository";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const user = await userRepository.findById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
```

- [ ] **Step 7: Write an integration test covering register → login → me → logout**

Create `src/app/api/auth/auth-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
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
```

- [ ] **Step 8: Run the tests**

Run: `npm test -- src/app/api/auth/auth-routes.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add auth API routes and session helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Theme repository, service, and API routes

**Files:**
- Create: `src/repositories/theme-repository.ts`
- Create: `src/services/theme-service.ts`
- Create: `src/dtos/theme-dto.ts`
- Create: `src/app/api/themes/route.ts`
- Create: `src/app/api/themes/[id]/route.ts`
- Test: `src/services/theme-service.test.ts`
- Test: `src/app/api/themes/theme-routes.test.ts`

**Interfaces:**
- Consumes: `requireUser` (Task 3), `prisma` (Task 1).
- Produces: `ThemeService` with `list(ownerId: string): Promise<Theme[]>`, `create(ownerId: string, name: string): Promise<Theme>`, `getOwned(ownerId: string, themeId: string): Promise<Theme>` (throws `Error("THEME_NOT_FOUND")`), `remove(ownerId: string, themeId: string): Promise<void>`, exported as `export const themeService = new ThemeService()`. Task 5's `QuestionService` calls `themeService.getOwned` to authorize before touching questions. Task 7's `GameService` calls it too.

- [ ] **Step 1: Implement the Theme repository**

Create `src/repositories/theme-repository.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import type { Theme } from "@prisma/client";

export class ThemeRepository {
  findAllByOwner(ownerId: string): Promise<Theme[]> {
    return prisma.theme.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<Theme | null> {
    return prisma.theme.findFirst({ where: { id, ownerId } });
  }

  create(data: { name: string; ownerId: string }): Promise<Theme> {
    return prisma.theme.create({ data });
  }

  delete(id: string): Promise<Theme> {
    return prisma.theme.delete({ where: { id } });
  }

  countQuestions(themeId: string): Promise<number> {
    return prisma.question.count({ where: { themeId } });
  }
}

export const themeRepository = new ThemeRepository();
```

- [ ] **Step 2: Write failing tests for ThemeService**

Create `src/services/theme-service.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/services/theme-service.test.ts`
Expected: FAIL (module has no exported member `ThemeService`)

- [ ] **Step 4: Implement ThemeService**

Create `src/services/theme-service.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/services/theme-service.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Write the Theme DTOs**

Create `src/dtos/theme-dto.ts`:

```typescript
import { z } from "zod";

export const createThemeSchema = z.object({
  name: z.string().min(2).max(120),
});

export type CreateThemeInput = z.infer<typeof createThemeSchema>;
```

- [ ] **Step 7: Implement the themes collection route**

Create `src/app/api/themes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { createThemeSchema } from "@/dtos/theme-dto";
import { themeService } from "@/services/theme-service";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const themes = await themeService.list(session.userId);
  return NextResponse.json({ themes });
}

export async function POST(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = createThemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  const theme = await themeService.create(session.userId, parsed.data.name);
  return NextResponse.json({ theme }, { status: 201 });
}
```

- [ ] **Step 8: Implement the theme item route**

Create `src/app/api/themes/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { themeService } from "@/services/theme-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const theme = await themeService.getOwned(session.userId, params.id);
    return NextResponse.json({ theme });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await themeService.remove(session.userId, params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}
```

- [ ] **Step 9: Write an integration test for the theme routes**

Create `src/app/api/themes/theme-routes.test.ts`:

```typescript
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
```

- [ ] **Step 10: Run the tests**

Run: `npm test -- src/app/api/themes`
Expected: PASS (1 test)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add theme repository, service, and API routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Question repository, service (with 100-question cap), media upload, and API routes

**Files:**
- Create: `src/repositories/question-repository.ts`
- Create: `src/services/question-service.ts`
- Create: `src/dtos/question-dto.ts`
- Create: `src/lib/upload.ts`
- Create: `src/app/api/themes/[id]/questions/route.ts`
- Create: `src/app/api/questions/[id]/route.ts`
- Create: `src/app/api/uploads/route.ts`
- Test: `src/services/question-service.test.ts`

**Interfaces:**
- Consumes: `themeService.getOwned` (Task 4), `prisma` (Task 1).
- Produces: `QuestionService` with `listByTheme(ownerId, themeId): Promise<Question[]>`, `create(ownerId, themeId, input): Promise<Question>` (throws `Error("THEME_QUESTION_LIMIT")` at 100), `update(ownerId, questionId, input): Promise<Question>`, `remove(ownerId, questionId): Promise<void>`, exported as `export const questionService = new QuestionService()`. Task 7's `GameService` uses `questionRepository.findRandomByTheme` for the draw.
- Produces: `saveUploadedFile(file: File): Promise<string>` from `src/lib/upload.ts`, returning the public relative path (e.g. `/uploads/xyz.png`).

- [ ] **Step 1: Implement the upload helper**

Create `src/lib/upload.ts`:

```typescript
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
```

- [ ] **Step 2: Implement the upload API route**

Create `src/app/api/uploads/route.ts`:

```typescript
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
```

- [ ] **Step 3: Implement the Question repository**

Create `src/repositories/question-repository.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import type { Question, MediaType, MediaSource } from "@prisma/client";

export interface CreateQuestionData {
  themeId: string;
  prompt: string;
  answer: string;
  mediaType: MediaType;
  mediaSource: MediaSource | null;
  mediaValue: string | null;
}

export class QuestionRepository {
  findAllByTheme(themeId: string): Promise<Question[]> {
    return prisma.question.findMany({ where: { themeId }, orderBy: { createdAt: "desc" } });
  }

  findById(id: string): Promise<Question | null> {
    return prisma.question.findUnique({ where: { id } });
  }

  countByTheme(themeId: string): Promise<number> {
    return prisma.question.count({ where: { themeId } });
  }

  create(data: CreateQuestionData): Promise<Question> {
    return prisma.question.create({ data });
  }

  update(id: string, data: Partial<CreateQuestionData>): Promise<Question> {
    return prisma.question.update({ where: { id }, data });
  }

  delete(id: string): Promise<Question> {
    return prisma.question.delete({ where: { id } });
  }

  /** Returns up to `count` random questions from the theme (SQLite RANDOM()). */
  async findRandomByTheme(themeId: string, count: number): Promise<Question[]> {
    return prisma.$queryRawUnsafe<Question[]>(
      `SELECT * FROM "Question" WHERE "themeId" = ? ORDER BY RANDOM() LIMIT ?`,
      themeId,
      count
    );
  }
}

export const questionRepository = new QuestionRepository();
```

- [ ] **Step 4: Write failing tests for QuestionService**

Create `src/services/question-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuestionService } from "./question-service";

function makeQuestionRepoMock() {
  return {
    findAllByTheme: vi.fn(),
    findById: vi.fn(),
    countByTheme: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findRandomByTheme: vi.fn(),
  };
}

function makeThemeServiceMock() {
  return { getOwned: vi.fn() };
}

describe("QuestionService", () => {
  let questionRepo: ReturnType<typeof makeQuestionRepoMock>;
  let themeSvc: ReturnType<typeof makeThemeServiceMock>;
  let service: QuestionService;

  beforeEach(() => {
    questionRepo = makeQuestionRepoMock();
    themeSvc = makeThemeServiceMock();
    service = new QuestionService(questionRepo as any, themeSvc as any);
  });

  it("creates a question when the theme has fewer than 100 questions", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(5);
    questionRepo.create.mockResolvedValue({ id: "q1" });

    const result = await service.create("user_1", "theme_1", {
      prompt: "Quem construiu a arca?",
      answer: "Noé",
      mediaType: "none",
      mediaSource: null,
      mediaValue: null,
    });

    expect(result).toEqual({ id: "q1" });
    expect(questionRepo.create).toHaveBeenCalledWith({
      themeId: "theme_1",
      prompt: "Quem construiu a arca?",
      answer: "Noé",
      mediaType: "none",
      mediaSource: null,
      mediaValue: null,
    });
  });

  it("rejects creating a 101st question in a theme", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(100);

    await expect(
      service.create("user_1", "theme_1", {
        prompt: "x",
        answer: "y",
        mediaType: "none",
        mediaSource: null,
        mediaValue: null,
      })
    ).rejects.toThrow("THEME_QUESTION_LIMIT");
    expect(questionRepo.create).not.toHaveBeenCalled();
  });

  it("lists questions only after confirming theme ownership", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.findAllByTheme.mockResolvedValue([{ id: "q1" }]);

    const result = await service.listByTheme("user_1", "theme_1");

    expect(themeSvc.getOwned).toHaveBeenCalledWith("user_1", "theme_1");
    expect(result).toEqual([{ id: "q1" }]);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- src/services/question-service.test.ts`
Expected: FAIL (module has no exported member `QuestionService`)

- [ ] **Step 6: Implement QuestionService**

Create `src/services/question-service.ts`:

```typescript
import { questionRepository, QuestionRepository, CreateQuestionData } from "@/repositories/question-repository";
import { themeService, ThemeService } from "@/services/theme-service";
import type { MediaType, MediaSource } from "@prisma/client";

const MAX_QUESTIONS_PER_THEME = 100;

export interface QuestionInput {
  prompt: string;
  answer: string;
  mediaType: MediaType;
  mediaSource: MediaSource | null;
  mediaValue: string | null;
}

export class QuestionService {
  constructor(
    private repo: QuestionRepository = questionRepository,
    private themes: Pick<ThemeService, "getOwned"> = themeService
  ) {}

  async listByTheme(ownerId: string, themeId: string) {
    await this.themes.getOwned(ownerId, themeId);
    return this.repo.findAllByTheme(themeId);
  }

  async create(ownerId: string, themeId: string, input: QuestionInput) {
    await this.themes.getOwned(ownerId, themeId);
    const currentCount = await this.repo.countByTheme(themeId);
    if (currentCount >= MAX_QUESTIONS_PER_THEME) {
      throw new Error("THEME_QUESTION_LIMIT");
    }
    const data: CreateQuestionData = { themeId, ...input };
    return this.repo.create(data);
  }

  async update(ownerId: string, questionId: string, input: Partial<QuestionInput>) {
    const question = await this.repo.findById(questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");
    await this.themes.getOwned(ownerId, question.themeId);
    return this.repo.update(questionId, input);
  }

  async remove(ownerId: string, questionId: string) {
    const question = await this.repo.findById(questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");
    await this.themes.getOwned(ownerId, question.themeId);
    await this.repo.delete(questionId);
  }
}

export const questionService = new QuestionService();
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/services/question-service.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 8: Write the Question DTOs**

Create `src/dtos/question-dto.ts`:

```typescript
import { z } from "zod";

export const questionSchema = z.object({
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1).max(500),
  mediaType: z.enum(["none", "image", "gif", "video"]).default("none"),
  mediaSource: z.enum(["upload", "url"]).nullable().default(null),
  mediaValue: z.string().nullable().default(null),
});

export type QuestionInputDto = z.infer<typeof questionSchema>;
```

- [ ] **Step 9: Implement the theme-scoped questions route**

Create `src/app/api/themes/[id]/questions/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { questionSchema } from "@/dtos/question-dto";
import { questionService } from "@/services/question-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const questions = await questionService.listByTheme(session.userId, params.id);
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await questionService.create(session.userId, params.id, parsed.data);
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "THEME_QUESTION_LIMIT") {
      return NextResponse.json({ error: "THEME_QUESTION_LIMIT" }, { status: 422 });
    }
    if (err instanceof Error && err.message === "THEME_NOT_FOUND") {
      return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 10: Implement the single-question route**

Create `src/app/api/questions/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { questionSchema } from "@/dtos/question-dto";
import { questionService } from "@/services/question-service";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = questionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const question = await questionService.update(session.userId, params.id, parsed.data);
    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await questionService.remove(session.userId, params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add question repository, service, upload handling, and API routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Game creation service (transactional draw + block generation) and API routes

**Files:**
- Create: `src/repositories/game-repository.ts`
- Create: `src/services/game-service.ts`
- Create: `src/dtos/game-dto.ts`
- Create: `src/app/api/games/route.ts`
- Create: `src/app/api/games/[id]/route.ts`
- Test: `src/services/game-service.test.ts`

**Interfaces:**
- Consumes: `themeService.getOwned` (Task 4), `questionRepository.findRandomByTheme` (Task 5), `prisma` (Task 1).
- Produces: `GameService` with `create(ownerId, input): Promise<GameWithBlocksAndTeams>` (throws `Error("THEME_NOT_FOUND")`, `Error("NOT_ENOUGH_QUESTIONS")`), `getOwned(ownerId, gameId): Promise<GameWithBlocksAndTeams>` (throws `Error("GAME_NOT_FOUND")`), `listByOwner(ownerId, status?: GameStatus): Promise<Game[]>`, exported as `export const gameService = new GameService()`. Task 7 (reveal/scoring) and Task 8 (finish/history) both call `gameService.getOwned`.

- [ ] **Step 1: Implement the Game repository**

Create `src/repositories/game-repository.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import type { Game, GameStatus, BlockType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const gameWithDetailsInclude = {
  blocks: { orderBy: { position: "asc" as const }, include: { question: true } },
  teams: true,
  theme: true,
} satisfies Prisma.GameInclude;

export type GameWithDetails = Prisma.GameGetPayload<{ include: typeof gameWithDetailsInclude }>;

export interface NewBlock {
  position: number;
  type: BlockType;
  questionId: string | null;
  pointsValue: number | null;
}

export interface NewTeam {
  name: string;
  color: string;
}

export class GameRepository {
  findByIdAndOwner(id: string, ownerId: string): Promise<GameWithDetails | null> {
    return prisma.game.findFirst({
      where: { id, ownerId },
      include: gameWithDetailsInclude,
    });
  }

  findAllByOwner(ownerId: string, status?: GameStatus): Promise<Game[]> {
    return prisma.game.findMany({
      where: { ownerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Creates the Game, its GameBlocks, and its Teams in a single transaction. */
  async createWithBlocksAndTeams(params: {
    ownerId: string;
    themeId: string;
    title: string;
    questionCount: number;
    specialBlockPercent: number;
    blocks: NewBlock[];
    teams: NewTeam[];
  }): Promise<GameWithDetails> {
    const gameId = await prisma.$transaction(async (tx) => {
      const game = await tx.game.create({
        data: {
          ownerId: params.ownerId,
          themeId: params.themeId,
          title: params.title,
          questionCount: params.questionCount,
          specialBlockPercent: params.specialBlockPercent,
        },
      });

      await tx.gameBlock.createMany({
        data: params.blocks.map((b) => ({ ...b, gameId: game.id })),
      });

      await tx.team.createMany({
        data: params.teams.map((t) => ({ ...t, gameId: game.id, score: 0 })),
      });

      return game.id;
    });

    const created = await prisma.game.findUnique({
      where: { id: gameId },
      include: gameWithDetailsInclude,
    });
    if (!created) throw new Error("GAME_CREATION_FAILED");
    return created;
  }

  updateStatus(id: string, status: GameStatus, finishedAt?: Date): Promise<Game> {
    return prisma.game.update({ where: { id }, data: { status, finishedAt } });
  }
}

export const gameRepository = new GameRepository();
```

- [ ] **Step 2: Write failing tests for GameService's draw/block-generation logic**

Create `src/services/game-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameService } from "./game-service";

function makeGameRepoMock() {
  return {
    createWithBlocksAndTeams: vi.fn(),
    findByIdAndOwner: vi.fn(),
    findAllByOwner: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function makeQuestionRepoMock() {
  return { findRandomByTheme: vi.fn(), countByTheme: vi.fn() };
}

function makeThemeServiceMock() {
  return { getOwned: vi.fn() };
}

describe("GameService.create", () => {
  let gameRepo: ReturnType<typeof makeGameRepoMock>;
  let questionRepo: ReturnType<typeof makeQuestionRepoMock>;
  let themeSvc: ReturnType<typeof makeThemeServiceMock>;
  let service: GameService;

  beforeEach(() => {
    gameRepo = makeGameRepoMock();
    questionRepo = makeQuestionRepoMock();
    themeSvc = makeThemeServiceMock();
    service = new GameService(gameRepo as any, questionRepo as any, themeSvc as any);
  });

  it("rejects when the theme has fewer questions than requested", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(5);

    await expect(
      service.create("user_1", {
        title: "Gênesis Quiz",
        themeId: "theme_1",
        questionCount: 10,
        specialBlockPercent: 0,
        teams: [{ name: "A", color: "#f00" }, { name: "B", color: "#00f" }],
      })
    ).rejects.toThrow("NOT_ENOUGH_QUESTIONS");
    expect(gameRepo.createWithBlocksAndTeams).not.toHaveBeenCalled();
  });

  it("builds exactly N question blocks plus special blocks from the percentage, all shuffled positions 0..N-1", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(20);
    const drawnQuestions = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}` }));
    questionRepo.findRandomByTheme.mockResolvedValue(drawnQuestions);
    gameRepo.createWithBlocksAndTeams.mockImplementation(async (params: any) => ({
      id: "game_1",
      ...params,
    }));

    await service.create("user_1", {
      title: "Gênesis Quiz",
      themeId: "theme_1",
      questionCount: 10,
      specialBlockPercent: 20,
      teams: [{ name: "A", color: "#f00" }, { name: "B", color: "#00f" }],
    });

    expect(questionRepo.findRandomByTheme).toHaveBeenCalledWith("theme_1", 10);
    const callArg = gameRepo.createWithBlocksAndTeams.mock.calls[0][0];
    // 10 question blocks + 20% of 10 = 2 special blocks = 12 total
    expect(callArg.blocks).toHaveLength(12);
    const positions = callArg.blocks.map((b: any) => b.position).sort((a: number, b: number) => a - b);
    expect(positions).toEqual(Array.from({ length: 12 }, (_, i) => i));
    const questionBlocks = callArg.blocks.filter((b: any) => b.type === "question");
    expect(questionBlocks).toHaveLength(10);
    const specialBlocks = callArg.blocks.filter((b: any) => b.type !== "question");
    expect(specialBlocks).toHaveLength(2);
    specialBlocks.forEach((b: any) => {
      expect(["bonus_points", "lose_points", "skip_turn"]).toContain(b.type);
      expect(b.questionId).toBeNull();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/services/game-service.test.ts`
Expected: FAIL (module has no exported member `GameService`)

- [ ] **Step 4: Implement GameService**

Create `src/services/game-service.ts`:

```typescript
import { gameRepository, GameRepository, NewBlock, NewTeam } from "@/repositories/game-repository";
import { questionRepository, QuestionRepository } from "@/repositories/question-repository";
import { themeService, ThemeService } from "@/services/theme-service";
import type { BlockType, GameStatus } from "@prisma/client";

export interface CreateGameInput {
  title: string;
  themeId: string;
  questionCount: number;
  specialBlockPercent: number;
  teams: { name: string; color: string }[];
}

const SPECIAL_TYPES: Exclude<BlockType, "question">[] = ["bonus_points", "lose_points", "skip_turn"];
const SPECIAL_POINTS: Record<"bonus_points" | "lose_points", number> = {
  bonus_points: 50,
  lose_points: -50,
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameService {
  constructor(
    private gameRepo: GameRepository = gameRepository,
    private questionRepo: QuestionRepository = questionRepository,
    private themes: Pick<ThemeService, "getOwned"> = themeService
  ) {}

  async create(ownerId: string, input: CreateGameInput) {
    const theme = await this.themes.getOwned(ownerId, input.themeId);
    const available = await this.questionRepo.countByTheme(theme.id);
    if (available < input.questionCount) {
      throw new Error("NOT_ENOUGH_QUESTIONS");
    }

    const drawnQuestions = await this.questionRepo.findRandomByTheme(theme.id, input.questionCount);

    const questionBlocks: NewBlock[] = drawnQuestions.map((q) => ({
      position: -1,
      type: "question",
      questionId: q.id,
      pointsValue: null,
    }));

    const specialCount = Math.floor((input.questionCount * input.specialBlockPercent) / 100);
    const specialBlocks: NewBlock[] = Array.from({ length: specialCount }, (_, i) => {
      const type = SPECIAL_TYPES[i % SPECIAL_TYPES.length];
      return {
        position: -1,
        type,
        questionId: null,
        pointsValue: type === "skip_turn" ? null : SPECIAL_POINTS[type],
      };
    });

    const shuffledBlocks = shuffle([...questionBlocks, ...specialBlocks]).map((block, index) => ({
      ...block,
      position: index,
    }));

    const teams: NewTeam[] = input.teams.map((t) => ({ name: t.name, color: t.color }));

    return this.gameRepo.createWithBlocksAndTeams({
      ownerId,
      themeId: theme.id,
      title: input.title,
      questionCount: input.questionCount,
      specialBlockPercent: input.specialBlockPercent,
      blocks: shuffledBlocks,
      teams,
    });
  }

  async getOwned(ownerId: string, gameId: string) {
    const game = await this.gameRepo.findByIdAndOwner(gameId, ownerId);
    if (!game) throw new Error("GAME_NOT_FOUND");
    return game;
  }

  listByOwner(ownerId: string, status?: GameStatus) {
    return this.gameRepo.findAllByOwner(ownerId, status);
  }
}

export const gameService = new GameService();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/services/game-service.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the Game DTOs**

Create `src/dtos/game-dto.ts`:

```typescript
import { z } from "zod";

export const createGameSchema = z.object({
  title: z.string().min(2).max(120),
  themeId: z.string().min(1),
  questionCount: z.number().int().min(1).max(100),
  specialBlockPercent: z.number().int().min(0).max(50),
  teams: z
    .array(z.object({ name: z.string().min(1).max(60), color: z.string().min(1).max(20) }))
    .min(2)
    .max(10),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
```

- [ ] **Step 7: Implement the games collection route**

Create `src/app/api/games/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { createGameSchema } from "@/dtos/game-dto";
import { gameService } from "@/services/game-service";

export async function GET(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "draft" | "in_progress" | "finished" | null;
  const games = await gameService.listByOwner(session.userId, status ?? undefined);
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const game = await gameService.create(session.userId, parsed.data);
    return NextResponse.json({ game }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_ENOUGH_QUESTIONS") {
      return NextResponse.json({ error: "NOT_ENOUGH_QUESTIONS" }, { status: 422 });
    }
    if (err instanceof Error && err.message === "THEME_NOT_FOUND") {
      return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 8: Implement the single-game route**

Create `src/app/api/games/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameService } from "@/services/game-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const game = await gameService.getOwned(session.userId, params.id);
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add game repository, transactional creation service, and API routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Block reveal, scoring, and finish-game service + API routes

**Files:**
- Modify: `src/repositories/game-repository.ts` (add block/team mutation methods)
- Create: `src/services/gameplay-service.ts`
- Create: `src/dtos/gameplay-dto.ts`
- Create: `src/app/api/games/[id]/blocks/[blockId]/reveal/route.ts`
- Create: `src/app/api/games/[id]/score/route.ts`
- Create: `src/app/api/games/[id]/finish/route.ts`
- Test: `src/services/gameplay-service.test.ts`

**Interfaces:**
- Consumes: `gameService.getOwned` (Task 6).
- Produces: `GameplayService` with `revealBlock(ownerId, gameId, blockId): Promise<GameBlock>` (marks revealed, applies special-block point effects to all teams for `bonus_points`/`lose_points`; `skip_turn` has no score effect — front-end shows the message), `adjustScore(ownerId, gameId, teamId, delta: number): Promise<Team>`, `finish(ownerId, gameId): Promise<Game>` (sets status `finished`, `finishedAt`), exported as `export const gameplayService = new GameplayService()`.

- [ ] **Step 1: Add block/team mutation methods to the Game repository**

Modify `src/repositories/game-repository.ts` — add these methods inside the `GameRepository` class (after `updateStatus`):

```typescript
  findBlockById(id: string) {
    return prisma.gameBlock.findUnique({ where: { id } });
  }

  markBlockRevealed(id: string) {
    return prisma.gameBlock.update({ where: { id }, data: { revealed: true } });
  }

  findTeamById(id: string) {
    return prisma.team.findUnique({ where: { id } });
  }

  findTeamsByGame(gameId: string) {
    return prisma.team.findMany({ where: { gameId } });
  }

  setTeamScore(id: string, score: number) {
    return prisma.team.update({ where: { id }, data: { score } });
  }

  incrementAllTeamScores(gameId: string, delta: number) {
    return prisma.team.updateMany({ where: { gameId }, data: { score: { increment: delta } } });
  }
```

- [ ] **Step 2: Write failing tests for GameplayService**

Create `src/services/gameplay-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameplayService } from "./gameplay-service";

function makeGameRepoMock() {
  return {
    findBlockById: vi.fn(),
    markBlockRevealed: vi.fn(),
    findTeamById: vi.fn(),
    setTeamScore: vi.fn(),
    incrementAllTeamScores: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function makeGameServiceMock() {
  return { getOwned: vi.fn() };
}

describe("GameplayService", () => {
  let gameRepo: ReturnType<typeof makeGameRepoMock>;
  let gameSvc: ReturnType<typeof makeGameServiceMock>;
  let service: GameplayService;

  beforeEach(() => {
    gameRepo = makeGameRepoMock();
    gameSvc = makeGameServiceMock();
    service = new GameplayService(gameRepo as any, gameSvc as any);
  });

  it("reveals a question block without touching scores", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "game_1", type: "question", pointsValue: null });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b1", revealed: true });

    const result = await service.revealBlock("user_1", "game_1", "b1");

    expect(result.revealed).toBe(true);
    expect(gameRepo.incrementAllTeamScores).not.toHaveBeenCalled();
  });

  it("applies bonus points to every team when a bonus_points block is revealed", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.findBlockById.mockResolvedValue({
      id: "b2",
      gameId: "game_1",
      type: "bonus_points",
      pointsValue: 50,
    });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b2", revealed: true });

    await service.revealBlock("user_1", "game_1", "b2");

    expect(gameRepo.incrementAllTeamScores).toHaveBeenCalledWith("game_1", 50);
  });

  it("rejects revealing a block that belongs to a different game", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "other_game", type: "question" });

    await expect(service.revealBlock("user_1", "game_1", "b1")).rejects.toThrow("BLOCK_NOT_FOUND");
  });

  it("adjusts a single team's score by a delta", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.findTeamById.mockResolvedValue({ id: "team_1", gameId: "game_1", score: 100 });
    gameRepo.setTeamScore.mockResolvedValue({ id: "team_1", score: 130 });

    const result = await service.adjustScore("user_1", "game_1", "team_1", 30);

    expect(gameRepo.setTeamScore).toHaveBeenCalledWith("team_1", 130);
    expect(result.score).toBe(130);
  });

  it("finishes a game", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.updateStatus.mockResolvedValue({ id: "game_1", status: "finished" });

    const result = await service.finish("user_1", "game_1");

    expect(gameRepo.updateStatus).toHaveBeenCalledWith("game_1", "finished", expect.any(Date));
    expect(result.status).toBe("finished");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/services/gameplay-service.test.ts`
Expected: FAIL (module has no exported member `GameplayService`)

- [ ] **Step 4: Implement GameplayService**

Create `src/services/gameplay-service.ts`:

```typescript
import { gameRepository, GameRepository } from "@/repositories/game-repository";
import { gameService, GameService } from "@/services/game-service";

export class GameplayService {
  constructor(
    private repo: GameRepository = gameRepository,
    private games: Pick<GameService, "getOwned"> = gameService
  ) {}

  async revealBlock(ownerId: string, gameId: string, blockId: string) {
    await this.games.getOwned(ownerId, gameId);
    const block = await this.repo.findBlockById(blockId);
    if (!block || block.gameId !== gameId) {
      throw new Error("BLOCK_NOT_FOUND");
    }

    const revealed = await this.repo.markBlockRevealed(blockId);

    if (block.type === "bonus_points" || block.type === "lose_points") {
      await this.repo.incrementAllTeamScores(gameId, block.pointsValue ?? 0);
    }

    return revealed;
  }

  async adjustScore(ownerId: string, gameId: string, teamId: string, delta: number) {
    await this.games.getOwned(ownerId, gameId);
    const team = await this.repo.findTeamById(teamId);
    if (!team || team.gameId !== gameId) {
      throw new Error("TEAM_NOT_FOUND");
    }
    return this.repo.setTeamScore(teamId, team.score + delta);
  }

  async finish(ownerId: string, gameId: string) {
    await this.games.getOwned(ownerId, gameId);
    return this.repo.updateStatus(gameId, "finished", new Date());
  }
}

export const gameplayService = new GameplayService();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/services/gameplay-service.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Write the gameplay DTOs**

Create `src/dtos/gameplay-dto.ts`:

```typescript
import { z } from "zod";

export const adjustScoreSchema = z.object({
  teamId: z.string().min(1),
  delta: z.number().int().min(-1000).max(1000),
});

export type AdjustScoreInput = z.infer<typeof adjustScoreSchema>;
```

- [ ] **Step 7: Implement the reveal-block route**

Create `src/app/api/games/[id]/blocks/[blockId]/reveal/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string; blockId: string } }
) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const block = await gameplayService.revealBlock(session.userId, params.id, params.blockId);
    return NextResponse.json({ block });
  } catch (err) {
    if (err instanceof Error && (err.message === "BLOCK_NOT_FOUND" || err.message === "GAME_NOT_FOUND")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 8: Implement the score-adjustment route**

Create `src/app/api/games/[id]/score/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { adjustScoreSchema } from "@/dtos/gameplay-dto";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = adjustScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const team = await gameplayService.adjustScore(
      session.userId,
      params.id,
      parsed.data.teamId,
      parsed.data.delta
    );
    return NextResponse.json({ team });
  } catch (err) {
    if (err instanceof Error && (err.message === "TEAM_NOT_FOUND" || err.message === "GAME_NOT_FOUND")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 9: Implement the finish-game route**

Create `src/app/api/games/[id]/finish/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { gameplayService } from "@/services/gameplay-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser(request);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const game = await gameplayService.finish(session.userId, params.id);
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "GAME_NOT_FOUND" }, { status: 404 });
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add block reveal, scoring, and finish-game logic with API routes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Auth UI (register/login) and app shell

**Files:**
- Create: `src/app/layout.tsx` (modify generated default)
- Create: `src/app/page.tsx` (modify generated default — redirect logic)
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/components/session-provider.tsx`
- Create: `src/hooks/use-session.ts`

**Interfaces:**
- Consumes: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` (Task 3).
- Produces: `useSession()` hook returning `{ user: { id, name, email } | null, loading: boolean, refresh: () => Promise<void> }`, used by every page under Task 9–11 to guard access and show the logged-in user.

- [ ] **Step 1: Implement the session hook**

Create `src/hooks/use-session.ts`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}
```

- [ ] **Step 2: Implement the login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p>
        Não tem conta? <a href="/register">Cadastre-se</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Implement the register page**

Create `src/app/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error === "EMAIL_TAKEN" ? "Este e-mail já está em uso." : "Dados inválidos.");
      return;
    }

    router.push("/login");
  }

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Criar conta</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <p>
        Já tem conta? <a href="/login">Entrar</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Update the root page to redirect based on session**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return null;
}
```

- [ ] **Step 5: Confirm the root layout is minimal**

Ensure `src/app/layout.tsx` (generated by create-next-app) reads:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz Bíblico",
  description: "Jogo de perguntas bíblicas para competições em grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Manually verify the auth flow in the browser**

Run: `npm run dev`, open `http://localhost:3000`, register a user, log in, confirm redirect to `/dashboard` (will 404 until Task 9 — that's expected at this point).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add login/register UI and session hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Dashboard, theme management, and question CRUD UI

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/themes/[id]/page.tsx`
- Create: `src/components/question-form.tsx`

**Interfaces:**
- Consumes: `useSession` (Task 8), `GET/POST /api/themes`, `GET/POST /api/themes/[id]/questions`, `PATCH/DELETE /api/questions/[id]`, `POST /api/uploads` (Tasks 4–5).
- Produces: none consumed by later tasks (leaf UI), but establishes the `QuestionForm` component reused nowhere else — kept local to this task.

- [ ] **Step 1: Implement the dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";

interface Theme {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
  status: "draft" | "in_progress" | "finished";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [newThemeName, setNewThemeName] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch("/api/themes").then((r) => r.json()).then((d) => setThemes(d.themes ?? []));
    fetch("/api/games").then((r) => r.json()).then((d) => setGames(d.games ?? []));
  }, [loading, user, router]);

  async function createTheme(e: React.FormEvent) {
    e.preventDefault();
    if (!newThemeName.trim()) return;
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newThemeName }),
    });
    if (res.ok) {
      const { theme } = await res.json();
      setThemes((prev) => [theme, ...prev]);
      setNewThemeName("");
    }
  }

  if (loading || !user) return null;

  const finishedGames = games.filter((g) => g.status === "finished");
  const activeGames = games.filter((g) => g.status !== "finished");

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Olá, {user.name}</h1>

      <section>
        <h2>Temas</h2>
        <form onSubmit={createTheme}>
          <input
            placeholder="Nome do tema (ex: Livro de Gênesis)"
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
          />
          <button type="submit">Criar tema</button>
        </form>
        <ul>
          {themes.map((theme) => (
            <li key={theme.id}>
              <Link href={`/themes/${theme.id}`}>{theme.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Jogos</h2>
        <Link href="/games/new">Criar novo jogo</Link>
        <ul>
          {activeGames.map((game) => (
            <li key={game.id}>
              <Link href={`/games/${game.id}`}>{game.title}</Link> ({game.status})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Histórico</h2>
        <ul>
          {finishedGames.map((game) => (
            <li key={game.id}>
              <Link href={`/games/${game.id}/result`}>{game.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Implement the reusable question form component**

Create `src/components/question-form.tsx`:

```tsx
"use client";

import { useState } from "react";

export interface QuestionFormValue {
  prompt: string;
  answer: string;
  mediaType: "none" | "image" | "gif" | "video";
  mediaSource: "upload" | "url" | null;
  mediaValue: string | null;
}

export function QuestionForm({
  onSubmit,
  submitLabel,
}: {
  onSubmit: (value: QuestionFormValue) => Promise<void>;
  submitLabel: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [mediaType, setMediaType] = useState<QuestionFormValue["mediaType"]>("none");
  const [mediaMode, setMediaMode] = useState<"upload" | "url">("url");
  const [mediaUrl, setMediaUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let mediaValue: string | null = null;
    let mediaSource: QuestionFormValue["mediaSource"] = null;

    if (mediaType !== "none") {
      mediaSource = mediaMode;
      if (mediaMode === "url") {
        mediaValue = mediaUrl || null;
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        mediaValue = data.url;
      }
    }

    await onSubmit({ prompt, answer, mediaType, mediaSource, mediaValue });

    setPrompt("");
    setAnswer("");
    setMediaType("none");
    setMediaUrl("");
    setFile(null);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Pergunta
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
      </label>
      <label>
        Resposta
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} required />
      </label>
      <label>
        Mídia
        <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}>
          <option value="none">Nenhuma</option>
          <option value="image">Imagem</option>
          <option value="gif">Gif</option>
          <option value="video">Vídeo</option>
        </select>
      </label>
      {mediaType !== "none" && (
        <>
          <label>
            <input
              type="radio"
              name="mediaMode"
              checked={mediaMode === "url"}
              onChange={() => setMediaMode("url")}
            />
            Link (URL)
          </label>
          <label>
            <input
              type="radio"
              name="mediaMode"
              checked={mediaMode === "upload"}
              onChange={() => setMediaMode("upload")}
            />
            Upload
          </label>
          {mediaMode === "url" ? (
            <input
              placeholder="https://..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          ) : (
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          )}
        </>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement the theme detail page (question CRUD)**

Create `src/app/themes/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QuestionForm, QuestionFormValue } from "@/components/question-form";

interface Question {
  id: string;
  prompt: string;
  answer: string;
  mediaType: string;
}

export default function ThemeDetailPage() {
  const params = useParams<{ id: string }>();
  const [themeName, setThemeName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const themeRes = await fetch(`/api/themes/${params.id}`);
    if (themeRes.ok) {
      const { theme } = await themeRes.json();
      setThemeName(theme.name);
    }
    const questionsRes = await fetch(`/api/themes/${params.id}/questions`);
    if (questionsRes.ok) {
      const { questions } = await questionsRes.json();
      setQuestions(questions);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function handleCreate(value: QuestionFormValue) {
    setError(null);
    const res = await fetch(`/api/themes/${params.id}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error === "THEME_QUESTION_LIMIT" ? "Limite de 100 perguntas atingido." : "Erro ao salvar.");
      return;
    }
    loadData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    loadData();
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>{themeName}</h1>
      <p>{questions.length} / 100 perguntas</p>

      <h2>Nova pergunta</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <QuestionForm onSubmit={handleCreate} submitLabel="Adicionar pergunta" />

      <h2>Perguntas cadastradas</h2>
      <ul>
        {questions.map((q) => (
          <li key={q.id}>
            <strong>{q.prompt}</strong> — resposta: {q.answer}
            <button onClick={() => handleDelete(q.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, log in, create a theme, add 2-3 questions (one with an uploaded image, one with a URL), confirm they list and can be deleted.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard and theme/question management UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Game creation UI

**Files:**
- Create: `src/app/games/new/page.tsx`

**Interfaces:**
- Consumes: `useSession` (Task 8), `GET /api/themes`, `POST /api/games` (Tasks 4, 6).
- Produces: navigates to `/games/[id]` on success — consumed by Task 11's page route.

- [ ] **Step 1: Implement the game-creation page**

Create `src/app/games/new/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Theme {
  id: string;
  name: string;
}

export default function NewGamePage() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [specialBlockPercent, setSpecialBlockPercent] = useState(10);
  const [teams, setTeams] = useState([
    { name: "Time 1", color: "#e63946" },
    { name: "Time 2", color: "#1d3557" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((d) => {
        setThemes(d.themes ?? []);
        if (d.themes?.[0]) setThemeId(d.themes[0].id);
      });
  }, []);

  function updateTeam(index: number, field: "name" | "color", value: string) {
    setTeams((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function addTeam() {
    setTeams((prev) => [...prev, { name: `Time ${prev.length + 1}`, color: "#2a9d8f" }]);
  }

  function removeTeam(index: number) {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, themeId, questionCount, specialBlockPercent, teams }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(
        body.error === "NOT_ENOUGH_QUESTIONS"
          ? "O tema não tem perguntas suficientes."
          : "Erro ao criar o jogo."
      );
      return;
    }

    const { game } = await res.json();
    router.push(`/games/${game.id}`);
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Criar jogo</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Tema
          <select value={themeId} onChange={(e) => setThemeId(e.target.value)} required>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade de perguntas
          <input
            type="number"
            min={1}
            max={100}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
          />
        </label>
        <label>
          % de blocos especiais
          <input
            type="number"
            min={0}
            max={50}
            value={specialBlockPercent}
            onChange={(e) => setSpecialBlockPercent(Number(e.target.value))}
          />
        </label>

        <h2>Times</h2>
        {teams.map((team, i) => (
          <div key={i}>
            <input value={team.name} onChange={(e) => updateTeam(i, "name", e.target.value)} />
            <input
              type="color"
              value={team.color}
              onChange={(e) => updateTeam(i, "color", e.target.value)}
            />
            {teams.length > 2 && <button type="button" onClick={() => removeTeam(i)}>Remover</button>}
          </div>
        ))}
        <button type="button" onClick={addTeam}>
          Adicionar time
        </button>

        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">Criar jogo</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`, create a game from a theme with at least 5 questions, confirm it redirects to `/games/[id]` (404 until Task 11 — expected).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add game creation UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Gameplay screen (block grid, reveal, scoring) and finished-result/history UI

**Files:**
- Create: `src/app/games/[id]/page.tsx`
- Create: `src/app/games/[id]/result/page.tsx`
- Create: `src/components/block-grid.tsx`
- Create: `src/components/scoreboard.tsx`

**Interfaces:**
- Consumes: `GET /api/games/[id]`, `POST /api/games/[id]/blocks/[blockId]/reveal`, `POST /api/games/[id]/score`, `POST /api/games/[id]/finish` (Tasks 6–7).
- Produces: none (final leaf UI).

- [ ] **Step 1: Implement the Scoreboard component**

Create `src/components/scoreboard.tsx`:

```tsx
interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

export function Scoreboard({
  teams,
  onAdjust,
}: {
  teams: Team[];
  onAdjust?: (teamId: string, delta: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {teams.map((team) => (
        <div key={team.id} style={{ border: `2px solid ${team.color}`, padding: 8, borderRadius: 8 }}>
          <strong>{team.name}</strong>
          <div style={{ fontSize: 24 }}>{team.score}</div>
          {onAdjust && (
            <div>
              <button onClick={() => onAdjust(team.id, 10)}>+10</button>
              <button onClick={() => onAdjust(team.id, -10)}>-10</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement the BlockGrid component**

Create `src/components/block-grid.tsx`:

```tsx
interface Block {
  id: string;
  position: number;
  type: "question" | "bonus_points" | "lose_points" | "skip_turn";
  revealed: boolean;
}

export function BlockGrid({ blocks, onSelect }: { blocks: Block[]; onSelect: (block: Block) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 }}>
      {blocks.map((block) => (
        <button
          key={block.id}
          disabled={block.revealed}
          onClick={() => onSelect(block)}
          style={{
            aspectRatio: "1",
            fontSize: 20,
            background: block.revealed ? "#ccc" : "#457b9d",
            color: "white",
            border: "none",
            borderRadius: 8,
          }}
        >
          {block.revealed ? "" : block.position + 1}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement the game (presentation) page**

Create `src/app/games/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BlockGrid } from "@/components/block-grid";
import { Scoreboard } from "@/components/scoreboard";

interface Question {
  id: string;
  prompt: string;
  answer: string;
  mediaType: "none" | "image" | "gif" | "video";
  mediaSource: "upload" | "url" | null;
  mediaValue: string | null;
}

interface Block {
  id: string;
  position: number;
  type: "question" | "bonus_points" | "lose_points" | "skip_turn";
  revealed: boolean;
  question: Question | null;
  pointsValue: number | null;
}

interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

interface Game {
  id: string;
  title: string;
  status: "draft" | "in_progress" | "finished";
  blocks: Block[];
  teams: Team[];
}

function MediaPreview({ question }: { question: Question }) {
  if (question.mediaType === "none" || !question.mediaValue) return null;
  if (question.mediaType === "video") {
    return question.mediaSource === "url" ? (
      <iframe
        src={question.mediaValue}
        style={{ width: "100%", height: 360, border: "none" }}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : (
      <video src={question.mediaValue} controls style={{ maxWidth: "100%" }} />
    );
  }
  return <img src={question.mediaValue} alt="" style={{ maxWidth: "100%", maxHeight: 360 }} />;
}

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  async function loadGame() {
    const res = await fetch(`/api/games/${params.id}`);
    if (res.ok) {
      const { game } = await res.json();
      setGame(game);
    }
  }

  useEffect(() => {
    loadGame();
  }, [params.id]);

  async function handleSelectBlock(block: Block) {
    const res = await fetch(`/api/games/${params.id}/blocks/${block.id}/reveal`, { method: "POST" });
    if (res.ok) {
      await loadGame();
      setActiveBlock({ ...block, revealed: true });
    }
  }

  async function handleAdjustScore(teamId: string, delta: number) {
    await fetch(`/api/games/${params.id}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, delta }),
    });
    loadGame();
  }

  async function handleFinish() {
    await fetch(`/api/games/${params.id}/finish`, { method: "POST" });
    router.push(`/games/${params.id}/result`);
  }

  if (!game) return null;

  return (
    <main style={{ maxWidth: 960, margin: "24px auto", fontFamily: "sans-serif" }}>
      <h1>{game.title}</h1>
      <Scoreboard teams={game.teams} onAdjust={handleAdjustScore} />

      {activeBlock?.type === "question" && activeBlock.question && (
        <section style={{ margin: "24px 0", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <h2>{activeBlock.question.prompt}</h2>
          <MediaPreview question={activeBlock.question} />
          <p>
            <strong>Resposta:</strong> {activeBlock.question.answer}
          </p>
        </section>
      )}
      {activeBlock && activeBlock.type !== "question" && (
        <section style={{ margin: "24px 0", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <h2>
            {activeBlock.type === "bonus_points" && `Bônus! +${activeBlock.pointsValue} para todos`}
            {activeBlock.type === "lose_points" && `Perde pontos! ${activeBlock.pointsValue} para todos`}
            {activeBlock.type === "skip_turn" && "Passa a vez!"}
          </h2>
        </section>
      )}

      <BlockGrid blocks={game.blocks} onSelect={handleSelectBlock} />

      <button onClick={handleFinish} style={{ marginTop: 24 }}>
        Encerrar jogo
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Implement the result/history page**

Create `src/app/games/[id]/result/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

interface Game {
  id: string;
  title: string;
  teams: Team[];
}

export default function GameResultPage() {
  const params = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    fetch(`/api/games/${params.id}`)
      .then((r) => r.json())
      .then((d) => setGame(d.game));
  }, [params.id]);

  if (!game) return null;

  const ranked = [...game.teams].sort((a, b) => b.score - a.score);

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>{game.title} — resultado final</h1>
      <ol>
        {ranked.map((team) => (
          <li key={team.id} style={{ fontSize: 20, color: team.color }}>
            {team.name}: {team.score} pontos
          </li>
        ))}
      </ol>
      <Link href="/dashboard">Voltar ao painel</Link>
    </main>
  );
}
```

- [ ] **Step 5: Manually verify the full flow end to end**

Run: `npm run dev`. Register → log in → create a theme with 5+ questions (mixing upload and URL media) → create a game with 5 questions and 20% special blocks → reveal several blocks, confirm question blocks show the answer and let you adjust scores, confirm bonus/lose blocks auto-adjust every team's score → finish the game → confirm the result page shows the ranked final score → go to the dashboard and confirm the game now appears under Histórico.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add gameplay screen and game result/history UI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: README and full test suite run

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# Quiz Bíblico

Jogo de perguntas e respostas no estilo Baamboozle, para competições
bíblicas presenciais. Roda localmente e é operado por um notebook
conectado a um telão.

## Requisitos

- Node.js 20+

## Configuração

\`\`\`bash
npm install
cp .env.example .env   # ajuste JWT_SECRET
npx prisma migrate dev
\`\`\`

## Rodando localmente

\`\`\`bash
npm run dev
\`\`\`

Acesse `http://localhost:3000`, crie uma conta e comece a cadastrar
temas e perguntas.

## Testes

\`\`\`bash
npm test
\`\`\`

## Como funciona

1. Cadastre um **Tema** (ex: um livro da Bíblia) e suas perguntas
   (até 100 por tema), com imagem/gif/vídeo opcional por upload ou
   link.
2. Crie um **Jogo** escolhendo o tema, quantas perguntas sortear
   (até o total disponível), os times e o percentual de blocos
   especiais.
3. Na tela do jogo, os times escolhem blocos da grade; o
   apresentador revela a pergunta, decide manualmente se o time
   acertou e ajusta a pontuação.
4. Ao final, o resultado fica salvo no histórico, acessível pelo
   painel.
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS (all suites from Tasks 1–7)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add README with setup and usage instructions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
