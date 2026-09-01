# Operator Workspace Standalone

This directory is a self-contained version of Operator Workspace. It has its own browser GUI, Node HTTP API, JSON persistence, locale packs, tool registry, event planner, creative tool builder, learning modules, and local guide. It does **not** import the managed React client, tRPC router, Manus OAuth, managed database, built-in LLM, storage service, or any other project front-end/back-end at runtime.

## Run locally

Use Node.js 20 or newer:

```bash
cd standalone
npm run check
npm run test
npm start
```

Then open `http://localhost:8787`. To choose a different port, set `PORT`, for example `PORT=9000 npm start`. Runtime adapters are selected with `WORKSPACE_MODE=local|mock|production`. Local mode writes `data/workspace.json`; mock mode keeps changes in memory for ephemeral runs; production mode reads and writes the file named by `WORKSPACE_DATA_PATH` and falls back to local JSON unless `WORKSPACE_FALLBACK_MODE=none` is set. Workspace changes are stored in `data/workspace.json` by default, so this package is easy to back up, inspect, version, and move to another host.

## Included GUI abilities

The command center summarizes local tools, event scenarios, learning progress, and guide availability. Tool Deck exposes ready-to-use capability cards with enable/disable toggles. Event Planner manages Red Team, Blue Team, and White Cell lanes; scenario creation; lifecycle status; and a readiness gate for authorization, stop conditions, evidence planning, and White Cell approval. Creative Lab lets you define a custom tool name, category, purpose, fields, and runbook. Learning provides deployable modules with persistent progress. Guide / ask is a local, deterministic guide that responds to workflow, event, tool-design, scope, and learning questions without requiring an external model.

## Localization

The stable translation contract lives in `locales.mjs` and is served to the browser as `public/locales.mjs`. English, Spanish, and French are included. Add a locale by extending the same keys in `locales.mjs`, then add its option to `public/index.html`. The selected locale is persisted in local JSON settings.

## Safety boundary

The standalone build is designed for authorized security operations, defensive validation, isolated labs, and Red / Blue team exercises. Safe mode is visible and configurable, but it does not claim to be uncensored or remove authorization boundaries. The event planner prevents a scenario from moving Live until every readiness item, including White Cell approval, is checked. Any future high-impact adapter must enforce its own authentication, authorization, audit, and stop-condition checks.

## Deployment

The package is a plain Node application and can run on a local workstation, a private server, or a Node-compatible platform. It serves the GUI and API from one process. For a production deployment, place the data directory on durable storage, run behind HTTPS, add identity at the deployment boundary, and replace the local JSON adapter only when a separate durable database is required. Keep the local guide mode explicit if you later connect a model provider.
