# Operator Workspace

Operator Workspace is an authenticated operations console for organizing authorized security work, defensive monitoring, isolated lab projects, evidence, learning, and Red/Blue team event planning.

## What is included

The workspace combines a command-center dashboard, customizable tool areas, an accountable task queue, a provenance-aware evidence desk with Markdown export, a contextual guide, and an exercise command center for planning a complete event. The event console includes Red Team, Blue Team, and White Cell lanes; event dates and objectives; authorization state; scenario phases; success criteria; safety notes; and scenario lifecycle progression.

The guide and UI are intentionally scoped toward authorized assessments, defensive validation, purple-team exercises, and isolated labs. They do not provide instructions for unauthorized access, credential theft, persistence, evasion, malware, destructive actions, or real-system targeting without explicit authorization.

## Stack

The project is a full-stack TypeScript application using React, Vite, tRPC, Drizzle ORM, MySQL, and Vitest. Authenticated data lives in the database; the first-run seed creates a useful operator workspace and a sample Operation Northstar exercise without changing existing records.

## Development

Install dependencies with `pnpm install`. Run the development server with `pnpm dev`. Run the type checker with `pnpm check` and the test suite with `pnpm test`.

For schema changes, update `drizzle/schema.ts`, generate a migration with `pnpm drizzle-kit generate`, review the SQL, and apply it through the managed database workflow. Keep the `OPERATOR_WORKSPACE_GUIDE.md` current when adding new modules or workflows.

## Repository safety

This repository is intended to be a separate private copy of the workspace. Do not commit secrets, session tokens, database URLs, or generated local environment files. Configure deployment secrets through the hosting environment rather than storing them in Git.
