import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createExerciseScenario,
  createTask,
  createWorkspaceNote,
  ensureDefaultExercise,
  ensureDefaultWorkspace,
  getExerciseScenarios,
  getExerciseTeams,
  getExercises,
  getTasks,
  getToolAreas,
  getWorkspaceNotes,
  updateExerciseScenarioStatus,
  updateToolArea,
  updateTaskStatus,
} from "./db";

const fallbackAreas = [
  { id: 1, userId: 0, slug: "recon", name: "Recon & OSINT", description: "Asset inventory, public-source research, and approved discovery workflows.", category: "Discovery", icon: "scan", accent: "cyan", status: "ready" as const, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, userId: 0, slug: "defense", name: "Defensive Monitoring", description: "Detection engineering, telemetry review, and incident readiness.", category: "Defense", icon: "shield", accent: "amber", status: "ready" as const, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, userId: 0, slug: "lab", name: "Lab Infrastructure", description: "Safe, isolated environments for repeatable learning and validation.", category: "Infrastructure", icon: "server", accent: "violet", status: "setup" as const, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, userId: 0, slug: "evidence", name: "Evidence & Reporting", description: "Notes, findings, timelines, and export-ready engagement records.", category: "Documentation", icon: "file", accent: "rose", status: "setup" as const, sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
  { id: 5, userId: 0, slug: "learning", name: "Learning Path", description: "Guided modules, references, and next-step practice plans.", category: "Enablement", icon: "book", accent: "green", status: "ready" as const, sortOrder: 5, createdAt: new Date(), updatedAt: new Date() },
];

const fallbackTasks = [
  { id: 1, userId: 0, title: "Define the lab rules of engagement", description: "Capture authorized systems, time windows, contacts, and stop conditions before testing.", owner: "You", areaSlug: "lab", status: "active" as const, priority: "high" as const, scopeStatus: "authorized" as const, dueDate: "Today", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, userId: 0, title: "Review telemetry coverage", description: "Map endpoint and network signals to the scenarios you want to validate.", owner: "You", areaSlug: "defense", status: "review" as const, priority: "medium" as const, scopeStatus: "authorized" as const, dueDate: "Tomorrow", createdAt: new Date(), updatedAt: new Date() },
  { id: 3, userId: 0, title: "Build the first asset inventory", description: "Create a clean inventory of lab assets and the owner-approved discovery sources.", owner: "You", areaSlug: "recon", status: "backlog" as const, priority: "medium" as const, scopeStatus: "pending" as const, dueDate: "Sep 04", createdAt: new Date(), updatedAt: new Date() },
];

const fallbackExercise = {
  id: 1,
  userId: 0,
  name: "Operation Northstar",
  codename: "NORTHSTAR-26",
  status: "planning" as const,
  startDate: "Oct 14, 2026",
  endDate: "Oct 16, 2026",
  objective: "Validate detection, response, and evidence workflows across a controlled purple-team scenario.",
  authorizationStatus: "approved" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  teams: [
    { id: 1, exerciseId: 1, team: "red" as const, name: "Red Team", lead: "Morgan Lee", objective: "Exercise approved attack paths and record observable behaviors.", roster: "3 operators", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, exerciseId: 1, team: "blue" as const, name: "Blue Team", lead: "Jordan Patel", objective: "Detect, triage, contain, and document the exercise signals.", roster: "4 defenders", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, exerciseId: 1, team: "white" as const, name: "White Cell", lead: "Casey Rivera", objective: "Own authorization, safety calls, adjudication, and event timekeeping.", roster: "2 coordinators", createdAt: new Date(), updatedAt: new Date() },
  ],
  scenarios: [
    { id: 1, exerciseId: 1, title: "Initial access simulation", phase: "rehearse" as const, status: "ready" as const, redObjective: "Validate the approved entry path against the isolated lab service.", blueObjective: "Confirm the alert, triage owner, and evidence capture steps.", successCriteria: "Alert acknowledged within 10 minutes; no out-of-scope systems touched.", safetyNotes: "Use only the listed lab asset and stop on any unexpected production signal.", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, exerciseId: 1, title: "Credential exposure response", phase: "execute" as const, status: "draft" as const, redObjective: "Simulate a controlled credential exposure using synthetic accounts.", blueObjective: "Rotate synthetic credentials and preserve an auditable timeline.", successCriteria: "Containment decision recorded with timestamps and owner sign-off.", safetyNotes: "Synthetic credentials only; no real secrets or external accounts.", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, exerciseId: 1, title: "Lessons-learned review", phase: "review" as const, status: "draft" as const, redObjective: "Provide observations without repeating live actions.", blueObjective: "Map detections, gaps, and remediation owners.", successCriteria: "Joint after-action record completed and accepted by the white cell.", safetyNotes: "Keep the review evidence scoped to the exercise dataset.", createdAt: new Date(), updatedAt: new Date() },
  ],
};

const fallbackNotes = [
  { id: 1, userId: 0, title: "Scope before signal", content: "Every engagement starts with written authorization, an asset list, and stop conditions.", source: "Tool Security System Guide", context: "Rules-of-engagement reference for every authorized workflow.", kind: "decision" as const, areaSlug: "general", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, userId: 0, title: "Pi workshop security concept", content: "Use the existing Pi hardware as an isolated learning project for camera, sensor, and alert telemetry.", source: "Tool Security System Guide", context: "Safe home-lab concept captured from the uploaded project guide.", kind: "note" as const, areaSlug: "lab", createdAt: new Date(), updatedAt: new Date() },
];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      await ensureDefaultWorkspace(ctx.user.id);
      await ensureDefaultExercise(ctx.user.id);
      const [areas, tasks, notes, eventRows] = await Promise.all([
        getToolAreas(ctx.user.id),
        getTasks(ctx.user.id),
        getWorkspaceNotes(ctx.user.id),
        getExercises(ctx.user.id),
      ]);
      const event = eventRows[0];
      const [teams, scenarios] = event ? await Promise.all([getExerciseTeams(event.id), getExerciseScenarios(event.id)]) : [[], []];
      return {
        areas: areas.length ? areas : fallbackAreas,
        tasks: tasks.length ? tasks : fallbackTasks,
        notes: notes.length ? notes : fallbackNotes,
        exercise: event ? { ...event, teams, scenarios } : fallbackExercise,
      };
    }),
    createScenario: protectedProcedure
      .input(z.object({ exerciseId: z.number().int().positive(), title: z.string().trim().min(3).max(200), phase: z.enum(["plan", "rehearse", "execute", "review"]).default("plan"), redObjective: z.string().trim().max(2000).optional(), blueObjective: z.string().trim().max(2000).optional(), successCriteria: z.string().trim().max(2000).optional(), safetyNotes: z.string().trim().max(2000).optional() }))
      .mutation(async ({ input }) => {
        const created = await createExerciseScenario({ exerciseId: input.exerciseId, title: input.title, phase: input.phase, status: "draft", redObjective: input.redObjective ?? null, blueObjective: input.blueObjective ?? null, successCriteria: input.successCriteria ?? null, safetyNotes: input.safetyNotes ?? null });
        return created ?? { ...input, status: "draft" as const, id: Date.now(), createdAt: new Date(), updatedAt: new Date() };
      }),
    setScenarioStatus: protectedProcedure
      .input(z.object({ scenarioId: z.number().int().positive(), exerciseId: z.number().int().positive(), status: z.enum(["draft", "ready", "live", "complete"]) }))
      .mutation(async ({ input }) => {
        const updated = await updateExerciseScenarioStatus(input.scenarioId, input.exerciseId, input.status);
        return updated ?? { id: input.scenarioId, exerciseId: input.exerciseId, status: input.status };
      }),
    updateToolArea: protectedProcedure
      .input(z.object({ slug: z.string().trim().min(2).max(64), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500), status: z.enum(["ready", "setup", "offline"]) }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateToolArea(ctx.user.id, input.slug, { name: input.name, description: input.description, status: input.status });
        return updated ?? input;
      }),
    createTask: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(3).max(240),
        description: z.string().trim().max(2000).optional(),
        owner: z.string().trim().max(160).default("You"),
        areaSlug: z.string().trim().min(2).max(64),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
        scopeStatus: z.enum(["authorized", "pending", "blocked"]).default("pending"),
      }))
      .mutation(async ({ ctx, input }) => {
        const created = await createTask({
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          owner: input.owner,
          areaSlug: input.areaSlug,
          status: "backlog",
          priority: input.priority,
          scopeStatus: input.scopeStatus,
          dueDate: null,
        });
        return created ?? { ...input, id: Date.now(), status: "backlog" as const };
      }),
    setTaskStatus: protectedProcedure
      .input(z.object({ taskId: z.number().int().positive(), status: z.enum(["backlog", "active", "review", "complete"]) }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateTaskStatus(ctx.user.id, input.taskId, input.status);
        return updated ?? { id: input.taskId, status: input.status };
      }),
    createNote: protectedProcedure
      .input(z.object({
        title: z.string().trim().min(3).max(200),
        content: z.string().trim().min(1).max(6000),
        source: z.string().trim().max(500).optional(),
        context: z.string().trim().max(4000).optional(),
        kind: z.enum(["note", "finding", "evidence", "decision"]).default("note"),
        areaSlug: z.string().trim().min(2).max(64).default("general"),
      }))
      .mutation(async ({ ctx, input }) => {
        const created = await createWorkspaceNote({ userId: ctx.user.id, ...input, source: input.source ?? "Operator Workspace", context: input.context ?? "Captured during authorized workspace operations." });
        return created ?? { ...input, source: input.source ?? "Operator Workspace", context: input.context ?? "Captured during authorized workspace operations.", id: Date.now(), userId: ctx.user.id, createdAt: new Date(), updatedAt: new Date() };
      }),
  }),
  guide: router({
    ask: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(12),
        context: z.string().max(4000).optional(),
      }))
      .mutation(async ({ input }) => {
        const system = `You are the Operator Workspace guide. Help the user learn and organize authorized defensive security, red-team, purple-team, and home-lab work. Keep answers practical, explain prerequisites and verification steps, and ask clarifying questions when scope is unclear. Do not provide instructions for unauthorized access, credential theft, persistence, evasion, malware, destructive actions, or targeting real systems without explicit authorization. When a request crosses that line, redirect it to a safe lab or defensive alternative. Prefer checklists, safe defaults, and documentation practices. Workspace context: ${input.context ?? "No module selected."}`;
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [
              { role: "system", content: system },
              ...input.messages,
            ],
            maxTokens: 900,
          });
          const content = response.choices[0]?.message?.content;
          return { content: typeof content === "string" ? content : "I could not produce a guide response. Please try again with a more specific question." };
        } catch (error) {
          console.error("[Guide] LLM request failed:", error);
          return { content: "The guide is temporarily unavailable. You can still use the workspace checklists: confirm authorization, define scope, choose an isolated lab, document each action, and record the evidence needed to verify the result." };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
