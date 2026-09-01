import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const toolAreas = mysqlTable("toolAreas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  icon: varchar("icon", { length: 32 }).notNull().default("grid"),
  accent: varchar("accent", { length: 32 }).notNull().default("cyan"),
  status: mysqlEnum("status", ["ready", "setup", "offline"]).default("setup").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ToolArea = typeof toolAreas.$inferSelect;
export type InsertToolArea = typeof toolAreas.$inferInsert;

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  owner: varchar("owner", { length: 160 }),
  areaSlug: varchar("areaSlug", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["backlog", "active", "review", "complete"]).default("backlog").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  scopeStatus: mysqlEnum("scopeStatus", ["authorized", "pending", "blocked"]).default("pending").notNull(),
  dueDate: varchar("dueDate", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const workspaceNotes = mysqlTable("workspaceNotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 500 }),
  context: text("context"),
  kind: mysqlEnum("kind", ["note", "finding", "evidence", "decision"]).default("note").notNull(),
  areaSlug: varchar("areaSlug", { length: 64 }).notNull().default("general"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkspaceNote = typeof workspaceNotes.$inferSelect;
export type InsertWorkspaceNote = typeof workspaceNotes.$inferInsert;
