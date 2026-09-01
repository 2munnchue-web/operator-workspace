import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertTask,
  InsertUser,
  InsertWorkspaceNote,
  Task,
  ToolArea,
  User,
  WorkspaceNote,
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
