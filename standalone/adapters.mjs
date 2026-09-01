import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export function createAdapters({ mode = process.env.WORKSPACE_MODE || "local", dataPath, initialGuide }) {
  let memory;
  const loadJson = async path => JSON.parse(await readFile(path, "utf8"));
  const saveJson = async (path, workspace) => writeFile(path, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
  const loadLocal = async () => loadJson(dataPath);
  const saveLocal = async workspace => saveJson(dataPath, workspace);
  const productionPath = process.env.WORKSPACE_DATA_PATH ? resolve(process.env.WORKSPACE_DATA_PATH) : null;
  const loadProduction = async () => { if (!productionPath) throw new Error("WORKSPACE_DATA_PATH is required in production mode"); return loadJson(productionPath); };
  const saveProduction = async workspace => { if (!productionPath) throw new Error("WORKSPACE_DATA_PATH is required in production mode"); return saveJson(productionPath, workspace); };
  const fallbackEnabled = process.env.WORKSPACE_FALLBACK_MODE ? process.env.WORKSPACE_FALLBACK_MODE === "local" : true;
  const load = async () => {
    try {
      if (mode === "mock") { if (!memory) memory = await loadLocal(); return structuredClone(memory); }
      if (mode === "production") return await loadProduction();
      return loadLocal();
    } catch (error) {
      if (mode === "production" && fallbackEnabled) return loadLocal();
      throw error;
    }
  };
  const save = async workspace => {
    try {
      if (mode === "mock") { memory = structuredClone(workspace); return; }
      if (mode === "production") return await saveProduction(workspace);
      return saveLocal(workspace);
    } catch (error) {
      if (mode === "production" && fallbackEnabled) return saveLocal(workspace);
      throw error;
    }
  };
  return {
    mode,
    loadWorkspace: load,
    saveWorkspace: save,
    guide: { answer: initialGuide, mode: mode === "mock" ? "mock-local" : "local" },
      available: { persistence: mode === "mock" ? "memory" : "json", guide: "deterministic-local", fallback: mode === "production" && fallbackEnabled ? "local" : "none" },
  };
}
