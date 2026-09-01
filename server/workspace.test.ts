import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Keep the work inside an isolated, authorized lab and document the verification steps." } }] }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999999,
    openId: "workspace-validation-user",
    email: "workspace@example.com",
    name: "Workspace Tester",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("workspace procedures", () => {
  it("returns a usable first-run snapshot without a database connection", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const snapshot = await caller.workspace.snapshot();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(snapshot.areas.length).toBeGreaterThan(0);
    expect(snapshot.tasks[0]).toMatchObject({ status: expect.any(String), scopeStatus: expect.any(String) });
    expect(snapshot.notes[0]).toMatchObject({ source: expect.any(String), context: expect.any(String) });
    expect(snapshot.exercise).toMatchObject({ name: expect.any(String), codename: expect.any(String), authorizationStatus: expect.any(String) });
    expect(snapshot.exercise.teams.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.exercise.scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it("creates a task-shaped result without persisting when the database is unavailable", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const task = await caller.workspace.createTask({ title: "Validate the lab boundary", areaSlug: "lab", owner: "Operator" });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(task).toMatchObject({ title: "Validate the lab boundary", owner: "Operator", status: "backlog" });
  });

  it("creates an evidence-shaped result with default provenance", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const note = await caller.workspace.createNote({ title: "Verification record", content: "Observed the expected lab signal." });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(note).toMatchObject({ title: "Verification record", source: "Operator Workspace", context: expect.any(String) });
  });

  it("advances a task-shaped result without persistence", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const task = await caller.workspace.setTaskStatus({ taskId: 42, status: "review" });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(task).toMatchObject({ id: 42, status: "review" });
  });

  it("updates a tool-area-shaped result without persistence", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const area = await caller.workspace.updateToolArea({ slug: "lab", name: "Lab Systems", description: "Isolated validation space.", status: "ready" });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(area).toMatchObject({ slug: "lab", name: "Lab Systems", status: "ready" });
  });

  it("returns the scoped guide response for a valid question", async () => {
    const caller = appRouter.createCaller(createContext());
    const response = await caller.guide.ask({ messages: [{ role: "user", content: "How should I start a safe lab?" }] });
    expect(response.content).toContain("isolated");
  });

  it("returns a safe fallback when the guide model fails", async () => {
    const llm = await import("./_core/llm");
    vi.mocked(llm.invokeLLM).mockRejectedValueOnce(new Error("simulated guide outage"));
    const caller = appRouter.createCaller(createContext());
    const response = await caller.guide.ask({ messages: [{ role: "user", content: "What should I do next?" }] });
    expect(response.content).toContain("temporarily unavailable");
    expect(response.content).toContain("authorization");
  });

  it("creates a scenario-shaped result without persistence", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const scenario = await caller.workspace.createScenario({ exerciseId: 1, title: "Synthetic alert validation", phase: "rehearse" });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(scenario).toMatchObject({ exerciseId: 1, title: "Synthetic alert validation", phase: "rehearse", status: "draft" });
  });

  it("advances a scenario-shaped result without persistence", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "";
    const caller = appRouter.createCaller(createContext());
    const scenario = await caller.workspace.setScenarioStatus({ scenarioId: 7, exerciseId: 1, status: "ready" });
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    expect(scenario).toMatchObject({ id: 7, exerciseId: 1, status: "ready" });
  });

  it("requires an actionable task title", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.workspace.createTask({ title: "ok", areaSlug: "lab" })).rejects.toThrow();
  });

  it("rejects invalid task status transitions", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.workspace.setTaskStatus({ taskId: 0, status: "active" })).rejects.toThrow();
  });

  it("requires a non-empty guide question", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.guide.ask({ messages: [{ role: "user", content: "   " }] })).rejects.toThrow();
  });
});
