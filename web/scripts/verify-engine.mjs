import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const source = JSON.parse(await readFile("public/engine/manifest.json", "utf8"));
assert(source.python.length >= 8, "Expected real Python QA modules in manifest.");
for (const file of [
  "game/game_state.py",
  "game/save_manager.py",
  "gameguard/save_guard/validator.py",
  "gameguard/save_guard/compatibility.py",
  "gameguard/performance/regression.py",
  "gameguard/quality_gate/gate.py",
  "gameguard/reporting/report.py",
  "tests/unit/test_game_state.py",
  "test_data/saves/valid_save_v2.json",
  "test_data/saves/legacy_save_v1.json",
  "test_data/baselines/performance_baseline.json"
]) {
  assert(source.files.includes(file), "Missing repository file: " + file);
  await stat(join("public", "engine", file));
}
const code = await readFile("public/engine/gameguard/save_guard/validator.py", "utf8");
assert(code.includes("def inspect_save("), "Invalid Save Guardian source.");
const gate = await readFile("public/engine/gameguard/quality_gate/gate.py", "utf8");
assert(gate.includes("def evaluate_quality_gate("), "Invalid quality gate source.");
console.log("QA engine package verified: " + source.python.length + " real Python modules and " + source.files.length + " mirrored repository files.");

for (const asset of ["pyodide.mjs", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  await stat(join("public", "pyodide", asset));
}
console.log("Self-hosted Python runtime verified.");
