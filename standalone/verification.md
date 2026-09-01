# Standalone verification findings

The first exposed render showed the standalone shell but an empty content region. The cause was a browser module loading mismatch: the app imported a localization module outside the static directory, and the server did not declare `.mjs` as JavaScript. The localization module was copied into `public/`, the import was corrected, and the server MIME map now includes `.mjs`.

After restarting one clean process on port 8787, the independent GUI rendered its command center, local JSON-backed workspace data, Red/Blue/White Cell event preview, tool deck, language selector, safe/advanced toggles, and local guide entry points. The health endpoint returned `{ ok: true, mode: "standalone", storage: "local-json" }`. The API smoke test succeeded for workspace loading, local guide responses, scenario creation, and learning progress.

The localized browser check succeeded: selecting Español translated navigation, safe-mode label, hero heading, and learning/creative section copy. The Learning view rendered four local modules with progress controls. The Creative Lab rendered the custom tool form with name, category, description, fields, and runbook inputs plus an empty-state panel for user-designed tools.

The Event Planner rendered the explicit White Cell readiness gate and blocked the Ready → Live control while approval was missing. It also exposed Red, Blue, and White Cell lanes and scenario details. The Guide view rendered as a local JSON API conversation surface with a persistent mode indicator and no external model dependency. One small interpolation defect in the event eyebrow was corrected before continuing.

The localized Guide view accepted a natural-language planning question and returned a useful local response describing the Red / Blue / White Cell model, authorization, safety calls, and scenario gating. The response displayed mode, safe-mode state, and no external model dependency.

After the final restart, the Command Center rendered cleanly with the English baseline. Tool Deck now shows prerequisite, allowed scope, dry-run-by-default state, launch contract, and enable/disable control for each capability. The event count is back to the clean three-scenario baseline. Localization, creative tooling, learning, guide interaction, and tool metadata were all independently checked through the exposed standalone GUI.

Final release checks: the browser smoke test visited Command Center, Tool Deck, Event Planner, Creative Lab, Learning, and Guide in English, Spanish, and French; localized headings, titles, and active navigation labels rendered for all three locales. Standalone syntax checks and integration tests passed, including production adapter fallback simulation and guide history save/restore. The managed parent project also passed its TypeScript check, and no parent data or repository was modified by the standalone runtime.
