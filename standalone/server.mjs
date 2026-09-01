import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocale } from "./locales.mjs";
import { createAdapters } from "./adapters.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dataPath = join(root, "data", "workspace.json");
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 8787);
const adapters = createAdapters({ dataPath, initialGuide: "Local guide available for workflow, event, tool design, and learning questions." });

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

async function loadWorkspace() {
  return adapters.loadWorkspace();
}

async function saveWorkspace(workspace) {
  await adapters.saveWorkspace(workspace);
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function guideAnswer(question, workspace) {
  const lower = question.toLowerCase();
  if (lower.includes("scope") || lower.includes("authorization") || lower.includes("rules")) {
    return "Start with a written authorization record, an asset list, a time window, named stop conditions, and a White Cell contact. Keep synthetic credentials and isolated lab assets separate from production. Then map each scenario to an owner, observable success criteria, and the evidence you will capture.";
  }
  if (lower.includes("red") || lower.includes("blue") || lower.includes("exercise") || lower.includes("event")) {
    return `For ${workspace.event.name}, use the three-lane model: Red states the approved objective, Blue defines detection and response evidence, and White Cell controls authorization, safety calls, timekeeping, and adjudication. Progress scenarios from Draft to Ready to Live only after the readiness gate is complete.`;
  }
  if (lower.includes("learn") || lower.includes("study") || lower.includes("train")) {
    return "Choose one learning module, define the outcome you want to demonstrate, and capture a short evidence note when complete. A strong learning loop is: explain the concept, rehearse it in an isolated lab, verify the result, and record what should change next time.";
  }
  if (lower.includes("tool") || lower.includes("build") || lower.includes("create")) {
    return "Use Creative Lab to define a tool name, purpose, category, inputs, and a repeatable runbook. Keep tool actions explicit and reviewable; start with read-only or simulation behavior, then add a clear authorization checkpoint before any higher-impact operation.";
  }
  return `I can help structure your workspace, explain a security concept, plan a Red / Blue exercise, draft a checklist, design a tool card, or build a learning path. I’m acting as your ${workspace.settings.guidePersona || "scope-aware coach"}. Your saved default scope is: ${workspace.settings.defaultScope || "authorized work only"}. Tell me your goal, constraints, and what a successful result should look like.`;
}

async function handleApi(req, res, url) {
  const workspace = await loadWorkspace();
  const path = url.pathname;
  if (req.method === "GET" && path === "/api/workspace") return sendJson(res, 200, workspace);
  if (req.method === "GET" && path === "/healthz") return sendJson(res, 200, { ok: true, mode: "standalone", adapterMode: adapters.mode, storage: adapters.available.persistence, guide: adapters.available.guide });
  if (req.method === "GET" && path === "/api/guide") return sendJson(res, 200, { content: adapters.guide.answer, mode: workspace.settings.guideMode });

  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const body = await readBody(req);

  if (path === "/api/settings") {
    workspace.settings = { ...workspace.settings, ...body, locale: ["en", "es", "fr"].includes(body.locale) ? body.locale : workspace.settings.locale };
    await saveWorkspace(workspace);
    return sendJson(res, 200, workspace.settings);
  }
  if (path === "/api/tools/toggle") {
    const tool = workspace.tools.find(item => item.id === body.id);
    if (!tool) return sendJson(res, 404, { error: "Tool not found" });
    tool.enabled = Boolean(body.enabled);
    await saveWorkspace(workspace);
    return sendJson(res, 200, tool);
  }
  if (path === "/api/tools/custom") {
    const name = String(body.name || "").trim();
    if (name.length < 3) return sendJson(res, 400, { error: "Tool name must be at least 3 characters" });
    const tool = { id: `custom-${Date.now()}`, name, category: String(body.category || "Custom"), description: String(body.description || "User-designed tool card."), enabled: true, kind: "custom", accent: "cyan", prerequisites: String(body.prerequisites || "Define prerequisites"), allowedScope: String(body.allowedScope || "Authorized scope only"), dryRun: body.dryRun !== false, launchContract: String(body.launchContract || "Review scope before running"), fields: String(body.fields || ""), prompt: String(body.prompt || "Explain the next safe step for this tool."), runbook: String(body.runbook || "") };
    workspace.customTools.push(tool);
    await saveWorkspace(workspace);
    return sendJson(res, 201, tool);
  }
  if (path === "/api/guide") {
    const question = String(body.question || "").trim();
    if (!question) return sendJson(res, 400, { error: "Ask a question" });
    const answer = guideAnswer(question, workspace);
    workspace.settings.guideHistory = [...(workspace.settings.guideHistory || []), { role: "user", content: question }, { role: "assistant", content: answer }].slice(-20);
    await saveWorkspace(workspace);
    return sendJson(res, 200, { content: answer, mode: workspace.settings.guideMode, safeMode: workspace.settings.safeMode, history: workspace.settings.guideHistory });
  }
  if (path === "/api/scenarios") {
    const title = String(body.title || "").trim();
    if (title.length < 3) return sendJson(res, 400, { error: "Scenario title must be at least 3 characters" });
    const scenario = { id: `scenario-${Date.now()}`, title, phase: body.phase || "Plan", status: "Draft", red: String(body.red || "Define the approved Red objective."), blue: String(body.blue || "Define the Blue detection and response objective."), success: String(body.success || "Write an observable success criterion."), safety: String(body.safety || "Use isolated assets, synthetic accounts, and White Cell stop conditions.") };
    workspace.event.scenarios.push(scenario);
    await saveWorkspace(workspace);
    return sendJson(res, 201, scenario);
  }
  const scenarioMatch = path.match(/^\/api\/scenarios\/([^/]+)\/status$/);
  if (scenarioMatch) {
    const scenario = workspace.event.scenarios.find(item => item.id === scenarioMatch[1]);
    if (!scenario) return sendJson(res, 404, { error: "Scenario not found" });
    const allowed = ["Draft", "Ready", "Live", "Complete"];
    if (!allowed.includes(body.status)) return sendJson(res, 400, { error: "Unsupported scenario status" });
    if (body.status === "Live" && !Object.values(workspace.event.readiness).every(Boolean)) return sendJson(res, 409, { error: "Complete the readiness gate before moving a scenario live" });
    scenario.status = body.status;
    await saveWorkspace(workspace);
    return sendJson(res, 200, scenario);
  }
  const progressMatch = path.match(/^\/api\/learning\/([^/]+)\/progress$/);
  if (progressMatch) {
    const module = workspace.learning.find(item => item.id === progressMatch[1]);
    if (!module) return sendJson(res, 404, { error: "Learning module not found" });
    module.progress = Math.max(0, Math.min(100, Number(body.progress)));
    await saveWorkspace(workspace);
    return sendJson(res, 200, module);
  }
  return sendJson(res, 404, { error: "Not found" });
}

async function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/") || url.pathname === "/healthz") {
    try { return await handleApi(req, res, url); } catch (error) { console.error(error); return sendJson(res, 500, { error: "Standalone service error" }); }
  }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = normalize(join(publicDir, requested));
  if (!target.startsWith(publicDir)) return sendText(res, 403, "Forbidden");
  const file = existsSync(target) ? target : join(publicDir, "index.html");
  try { return sendText(res, 200, await readFile(file), mime[extname(file)] || "application/octet-stream"); } catch { return sendText(res, 404, "Not found"); }
}

createServer(serve).listen(port, () => console.log(`Standalone Operator Workspace listening on port ${port}`));
