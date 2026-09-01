# Operator Workspace Guide

## Purpose

Operator Workspace is a secure console for organizing authorized security, defensive monitoring, purple-team, and isolated home-lab work. The first version intentionally keeps **scope, evidence, and the next safe action** visible instead of hiding them behind separate applications.

| Area | What belongs there | Current foundation |
| --- | --- | --- |
| Recon & OSINT | Approved asset inventory, public-source research, and discovery notes | Ready |
| Defensive Monitoring | Telemetry coverage, detections, incident readiness, and review tasks | Ready |
| Lab Infrastructure | Isolated environments, Raspberry Pi projects, sensors, cameras, and repeatable validation | Setup |
| Evidence & Reporting | Findings, decisions, source references, and exportable records | Setup |
| Learning Path | Guided modules, prerequisites, references, and practice plans | Ready |

## Daily operating loop

Start by checking the **Work queue** and the **Scope checkpoint**. A task should have an owner, a clear area, a priority, a due-date signal when useful, and an explicit scope state. Before active work, confirm written authorization, the target and time window, stop conditions, and the evidence you expect to capture.

Use **Evidence desk** for decisions and observations that another person should be able to understand later. Every note can include a type, source, context, and area. The Export action creates a Markdown record that can be attached to a report or reviewed as a change log.

Use **Guide / ask** for questions about prerequisites, lab design, documentation, defensive validation, and the purpose of a tool category. The guide is contextual and is instructed to redirect requests that would enable unauthorized access, credential theft, persistence, evasion, malware, or destructive activity toward safe lab or defensive alternatives.

## Customizing tool areas

The initial areas are seeded in `server/db.ts` inside `ensureDefaultWorkspace`. To change the default areas, update the `toolAreas` seed entries: `slug` is the stable identifier, `name` is the display label, `description` is the card summary, `category` controls the small footer label, `icon` selects an icon from the client icon map, `accent` selects the visual accent, `status` is `ready`, `setup`, or `offline`, and `sortOrder` controls placement.

To add a new icon, extend `iconMap` in `client/src/pages/Home.tsx`. To add a new accent, extend `accentStyles` in the same file. Keep cyan and mint for primary actions, readiness, and synchronized states. Reserve other accents for clear operational meaning rather than decoration.

## Customizing the guide

The guide instruction lives in the `guide.ask` procedure in `server/routers.ts`. Adjust the system guidance there when you add new safe domains, terminology, or response formats. Keep the authorization and redirection rules intact. The front-end suggested prompts are in `client/src/pages/Home.tsx` in the `AIChatBox` component call.

## Data model

The core tables are `toolAreas`, `tasks`, and `workspaceNotes`, all associated with the authenticated `users` table. Tasks include status, priority, owner, due-date text, and scope state. Notes include type, area, source, context, and timestamps. The schema lives in `drizzle/schema.ts`; query helpers live in `server/db.ts`; typed procedures live in `server/routers.ts`.

When extending the schema, update `drizzle/schema.ts`, generate a migration with `pnpm drizzle-kit generate`, review the SQL, apply it through the managed database workflow, and then update the query helper, procedure, UI, and Vitest coverage together.

## Safe expansion roadmap

The next high-value build slice is a true tool-area editor with per-area checklists and links, followed by engagement templates, file attachments backed by S3, and a richer report exporter. Integrations with external security platforms should be added only after their authentication, authorization, and data-retention requirements are explicitly defined.
