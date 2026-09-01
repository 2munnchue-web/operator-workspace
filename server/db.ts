import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Exercise,
  ExerciseScenario,
  ExerciseTeam,
  InsertExercise,
  InsertExerciseScenario,
  InsertTask,
  InsertUser,
  InsertWorkspaceNote,
  Task,
  ToolArea,
  User,
  WorkspaceNote,
  exercises,
  exerciseTeams,
  exerciseScenarios,
  users,
  tasks,
  toolAreas,
  workspaceNotes,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getToolAreas(userId: number): Promise<ToolArea[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(toolAreas).where(eq(toolAreas.userId, userId)).orderBy(asc(toolAreas.sortOrder));
}

export async function getTasks(userId: number): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.updatedAt));
}

export async function getWorkspaceNotes(userId: number): Promise<WorkspaceNote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaceNotes).where(eq(workspaceNotes.userId, userId)).orderBy(desc(workspaceNotes.updatedAt));
}

export async function createTask(task: InsertTask): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(tasks).values(task);
  const insertedId = Number(result[0].insertId);
  const created = await db.select().from(tasks).where(and(eq(tasks.id, insertedId), eq(tasks.userId, task.userId))).limit(1);
  return created[0];
}

export async function updateTaskStatus(userId: number, taskId: number, status: Task["status"]): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(tasks).set({ status }).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  const updated = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).limit(1);
  return updated[0];
}

export async function createWorkspaceNote(note: InsertWorkspaceNote): Promise<WorkspaceNote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(workspaceNotes).values(note);
  const insertedId = Number(result[0].insertId);
  const created = await db.select().from(workspaceNotes).where(and(eq(workspaceNotes.id, insertedId), eq(workspaceNotes.userId, note.userId))).limit(1);
  return created[0];
}

export async function ensureDefaultWorkspace(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existingAreas = await getToolAreas(userId);
  if (existingAreas.length === 0) {
    await db.insert(toolAreas).values([
      { userId, slug: "recon", name: "Recon & OSINT", description: "Asset inventory, public-source research, and approved discovery workflows.", category: "Discovery", icon: "scan", accent: "cyan", status: "ready", sortOrder: 1 },
      { userId, slug: "defense", name: "Defensive Monitoring", description: "Detection engineering, telemetry review, and incident readiness.", category: "Defense", icon: "shield", accent: "amber", status: "ready", sortOrder: 2 },
      { userId, slug: "lab", name: "Lab Infrastructure", description: "Safe, isolated environments for repeatable learning and validation.", category: "Infrastructure", icon: "server", accent: "violet", status: "setup", sortOrder: 3 },
      { userId, slug: "evidence", name: "Evidence & Reporting", description: "Notes, findings, timelines, and export-ready engagement records.", category: "Documentation", icon: "file", accent: "rose", status: "setup", sortOrder: 4 },
      { userId, slug: "learning", name: "Learning Path", description: "Guided modules, references, and next-step practice plans.", category: "Enablement", icon: "book", accent: "green", status: "ready", sortOrder: 5 },
    ]);
  }

  const existingTasks = await getTasks(userId);
  if (existingTasks.length === 0) {
    await db.insert(tasks).values([
      { userId, title: "Define the lab rules of engagement", description: "Capture authorized systems, time windows, contacts, and stop conditions before testing.", owner: "You", areaSlug: "lab", status: "active", priority: "high", scopeStatus: "authorized", dueDate: "Today" },
      { userId, title: "Review telemetry coverage", description: "Map endpoint and network signals to the scenarios you want to validate.", owner: "You", areaSlug: "defense", status: "review", priority: "medium", scopeStatus: "authorized", dueDate: "Tomorrow" },
      { userId, title: "Build the first asset inventory", description: "Create a clean inventory of lab assets and the owner-approved discovery sources.", owner: "You", areaSlug: "recon", status: "backlog", priority: "medium", scopeStatus: "pending", dueDate: "Sep 04" },
    ]);
  }
}

export async function updateToolArea(userId: number, slug: string, values: Partial<Pick<ToolArea, "name" | "description" | "status">>): Promise<ToolArea | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(toolAreas).set(values).where(and(eq(toolAreas.userId, userId), eq(toolAreas.slug, slug)));
  const updated = await db.select().from(toolAreas).where(and(eq(toolAreas.userId, userId), eq(toolAreas.slug, slug))).limit(1);
  return updated[0];
}

export async function getExercises(userId: number): Promise<Exercise[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exercises).where(eq(exercises.userId, userId)).orderBy(desc(exercises.updatedAt));
}

export async function getExerciseTeams(exerciseId: number): Promise<ExerciseTeam[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exerciseTeams).where(eq(exerciseTeams.exerciseId, exerciseId)).orderBy(asc(exerciseTeams.id));
}

export async function getExerciseScenarios(exerciseId: number): Promise<ExerciseScenario[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exerciseScenarios).where(eq(exerciseScenarios.exerciseId, exerciseId)).orderBy(asc(exerciseScenarios.id));
}

export async function createExerciseScenario(scenario: InsertExerciseScenario): Promise<ExerciseScenario | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(exerciseScenarios).values(scenario);
  const insertedId = Number(result[0].insertId);
  const created = await db.select().from(exerciseScenarios).where(and(eq(exerciseScenarios.id, insertedId), eq(exerciseScenarios.exerciseId, scenario.exerciseId))).limit(1);
  return created[0];
}

export async function updateExerciseScenarioStatus(scenarioId: number, exerciseId: number, status: ExerciseScenario["status"]): Promise<ExerciseScenario | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(exerciseScenarios).set({ status }).where(and(eq(exerciseScenarios.id, scenarioId), eq(exerciseScenarios.exerciseId, exerciseId)));
  const updated = await db.select().from(exerciseScenarios).where(and(eq(exerciseScenarios.id, scenarioId), eq(exerciseScenarios.exerciseId, exerciseId))).limit(1);
  return updated[0];
}

export async function ensureDefaultExercise(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getExercises(userId);
  if (existing.length > 0) return;
  const result = await db.insert(exercises).values({ userId, name: "Operation Northstar", codename: "NORTHSTAR-26", status: "planning", startDate: "Oct 14, 2026", endDate: "Oct 16, 2026", objective: "Validate detection, response, and evidence workflows across a controlled purple-team scenario.", authorizationStatus: "approved" });
  const exerciseId = Number(result[0].insertId);
  await db.insert(exerciseTeams).values([
    { exerciseId, team: "red", name: "Red Team", lead: "Morgan Lee", objective: "Exercise approved attack paths and record observable behaviors.", roster: "3 operators" },
    { exerciseId, team: "blue", name: "Blue Team", lead: "Jordan Patel", objective: "Detect, triage, contain, and document the exercise signals.", roster: "4 defenders" },
    { exerciseId, team: "white", name: "White Cell", lead: "Casey Rivera", objective: "Own authorization, safety calls, adjudication, and event timekeeping.", roster: "2 coordinators" },
  ]);
  await db.insert(exerciseScenarios).values([
    { exerciseId, title: "Initial access simulation", phase: "rehearse", status: "ready", redObjective: "Validate the approved entry path against the isolated lab service.", blueObjective: "Confirm the alert, triage owner, and evidence capture steps.", successCriteria: "Alert acknowledged within 10 minutes; no out-of-scope systems touched.", safetyNotes: "Use only the listed lab asset and stop on any unexpected production signal." },
    { exerciseId, title: "Credential exposure response", phase: "execute", status: "draft", redObjective: "Simulate a controlled credential exposure using synthetic accounts.", blueObjective: "Rotate synthetic credentials and preserve an auditable timeline.", successCriteria: "Containment decision recorded with timestamps and owner sign-off.", safetyNotes: "Synthetic credentials only; no real secrets or external accounts." },
    { exerciseId, title: "Lessons-learned review", phase: "review", status: "draft", redObjective: "Provide observations without repeating live actions.", blueObjective: "Map detections, gaps, and remediation owners.", successCriteria: "Joint after-action record completed and accepted by the white cell.", safetyNotes: "Keep the review evidence scoped to the exercise dataset." },
  ]);
}
