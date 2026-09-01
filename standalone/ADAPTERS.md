# Standalone adapter seams

The default package is intentionally local-first. The GUI and API work with `data/workspace.json`, which makes the package runnable without another front-end or back-end. When you need production integrations, replace one seam at a time instead of rebuilding the application.

| Concern | Current standalone adapter | Production replacement seam |
|---|---|---|
| Identity | Deployment boundary; no built-in user account | Add a reverse-proxy identity layer or a small `/api/session` adapter before exposing multi-user data |
| Workspace data | `loadWorkspace()` and `saveWorkspace()` in `server.mjs` | Replace with a transactional database adapter and preserve the same JSON shapes |
| Tool execution | Tool cards describe fields and runbooks; no hidden execution | Add explicit, authenticated handlers per tool with allowlists, dry-run behavior, audit logs, and stop conditions |
| Guide | Local deterministic `guideAnswer()` | Add an optional provider behind `GUIDE_MODE`, retaining visible mode labels, prompt logging policy, and scope checks |
| Learning | Local module records and progress endpoint | Replace the data adapter with a course service while keeping module IDs and progress semantics |

Do not place secrets in this directory or in `workspace.json`. Keep credentials in the deployment environment. Any adapter that can reach a real system must require an explicit target, authorization context, audit record, and emergency stop path.
