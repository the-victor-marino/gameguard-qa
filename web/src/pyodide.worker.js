/* Run the repository's REAL Python QA modules in a browser-side Web Worker. */
let pyodide;
let queue = Promise.resolve();
const CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

function send(detail) { self.postMessage({ type: "progress", detail }); }
async function bootstrap(baseUrl) {
  send("Loading Python runtime (first visit may take a moment)…");
  const moduleUrl = CDN + "pyodide.mjs";
  const mod = await import(/* @vite-ignore */ moduleUrl);
  pyodide = await mod.loadPyodide({ indexURL: CDN });
  send("Synchronizing the GameGuard Python modules…");
  const manifestResponse = await fetch(new URL("engine/manifest.json", baseUrl));
  if (!manifestResponse.ok) throw new Error("Could not load the repository file manifest.");
  const manifest = await manifestResponse.json();
  pyodide.FS.mkdirTree("/engine");
  await Promise.all(manifest.python.map(async (file) => {
    const res = await fetch(new URL("engine/" + file, baseUrl));
    if (!res.ok) throw new Error("Missing Python module: " + file);
    const content = await res.text();
    const path = "/engine/" + file;
    pyodide.FS.mkdirTree(path.substring(0, path.lastIndexOf("/")));
    pyodide.FS.writeFile(path, new TextEncoder().encode(content));
  }));
  pyodide.runPython('import sys; sys.path.insert(0, "/engine")');
  pyodide.runPython("from gameguard.save_guard.validator import inspect_save; from gameguard.performance.regression import compare_performance");
  send("QA engine ready. All checks use the repository's Python source.");
  self.postMessage({ type: "ready" });
}
const scripts = {
  save: `import json
from gameguard.save_guard.validator import inspect_save
report = inspect_save("/engine/demo-save.json")
result_json = json.dumps({"safe": report.is_safe, "critical": report.critical_count, "issues": [{"code":i.code,"severity":i.severity.value,"message":i.message,"path":i.path} for i in report.issues]})
`,
  migration: `import json
from gameguard.save_guard.compatibility import migrate_to_current, assert_progression_preserved
before = json.loads(request_json)["save"]
fault = json.loads(request_json)["fault"]
after = None
passed = False
error = None
try:
    after = migrate_to_current(before)
    if fault == "lose-item": after["inventory"] = after["inventory"][1:]
    if fault == "lose-currency": after["currency"] = 0
    assert_progression_preserved(before, after)
    passed = True
except (ValueError, KeyError, TypeError) as exc:
    error = str(exc)
result_json = json.dumps({"before":before,"after":after,"passed":passed,"error":error})
`,
  performance: `import json
from dataclasses import asdict
from gameguard.performance.regression import compare_performance
p = json.loads(request_json)
report = compare_performance(p["baseline"],p["current"],p["budgets"])
result_json = json.dumps({"passed":report.passed,"metrics":[asdict(m) for m in report.metrics]})
`,
  release: `import json
from gameguard.quality_gate.gate import evaluate_quality_gate
from gameguard.reporting.report import build_markdown_report
r = evaluate_quality_gate("/engine/demo-save.json", "/engine/performance-baseline.json", "/engine/performance-current.json")
report = build_markdown_report("/engine/demo-save.json", "/engine/performance-baseline.json", "/engine/performance-current.json")
result_json = json.dumps({"passed":r.passed,"save_safe":r.save_safe,"performance_passed":r.performance_passed,"blockers":list(r.blockers),"report":report})
`,
};
async function execute(action, payload) {
  if (!scripts[action]) throw new Error("Unsupported QA action: " + action);
  const json = JSON.stringify(payload);
  if (action === "save" || action === "release") {
    pyodide.FS.writeFile("/engine/demo-save.json", new TextEncoder().encode(payload.saveText));
  }
  if (action === "release") {
    pyodide.FS.writeFile("/engine/performance-baseline.json", JSON.stringify(payload.baseline));
    pyodide.FS.writeFile("/engine/performance-current.json", JSON.stringify(payload.current));
  }
  pyodide.globals.set("request_json", json);
  await pyodide.runPythonAsync(scripts[action]);
  return JSON.parse(pyodide.globals.get("result_json"));
}
self.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    queue = queue.then(() => bootstrap(message.baseUrl)).catch((e) => {
      self.postMessage({ type: "init-error", error: String(e?.message || e) });
    });
  }
  if (message.type === "run") {
    queue = queue.then(async () => {
      try { self.postMessage({ type: "result", id: message.id, result: await execute(message.action, message.payload) }); }
      catch (e) { self.postMessage({ type: "error", id: message.id, error: String(e?.message || e) }); }
    });
  }
};
