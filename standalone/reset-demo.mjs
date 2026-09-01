import { readFile, writeFile } from "node:fs/promises";
const path = new URL("./data/workspace.json", import.meta.url);
const workspace = JSON.parse(await readFile(path, "utf8"));
workspace.settings.locale = "en";
workspace.event.scenarios = workspace.event.scenarios.filter(item => item.id !== "scenario-1788284271435" && item.title !== "Telemetry rehearsal");
for (const item of workspace.learning) {
  if (item.id === "scope-first") item.progress = 100;
  if (item.id === "blue-telemetry") item.progress = 60;
  if (item.id === "purple-rehearsal") item.progress = 20;
  if (item.id === "after-action") item.progress = 0;
}
await writeFile(path, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
