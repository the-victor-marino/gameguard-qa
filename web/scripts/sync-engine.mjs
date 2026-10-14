import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";

const root = resolve(process.cwd(), "..");
const target = resolve(process.cwd(), "public", "engine");
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

const files = [];
const python = [];
const include = ["game", "gameguard", "test_data", "tests", "docs"];
async function walk(dir) {
  const full = join(root, dir);
  const entries = await readdir(full, { withFileTypes: true });
  for (const entry of entries) {
    const subpath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__pycache__") await walk(subpath);
    } else if (entry.isFile() && /\.(py|json|md)$/.test(entry.name)) {
      const dest = join(target, subpath);
      await mkdir(resolve(dest, ".."), { recursive: true });
      await cp(join(root, subpath), dest);
      const normalized = relative(root, join(root, subpath)).replaceAll("\\", "/");
      files.push(normalized);
      if (normalized.endsWith(".py") && (normalized.startsWith("game/") || normalized.startsWith("gameguard/"))) python.push(normalized);
    }
  }
}
for (const dir of include) await walk(dir);
for (const extra of ["README.md", "pytest.ini", "requirements.txt", ".github/workflows/gameguard-ci.yml"]) {
  const dest = join(target, extra);
  await mkdir(resolve(dest, ".."), { recursive: true });
  await cp(join(root, extra), dest);
  files.push(extra);
}
python.sort();
files.sort();
await writeFile(join(target, "manifest.json"), JSON.stringify({ python, files }, null, 2), "utf8");
console.log("Synced " + files.length + " repository files, including " + python.length + " Python modules.");

const runtime = resolve(process.cwd(), "public", "pyodide");
await mkdir(runtime, { recursive: true });
for (const asset of ["pyodide.mjs", "pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  await cp(resolve(process.cwd(), "node_modules", "pyodide", asset), join(runtime, asset));
}
console.log("Copied first-party-hosted Pyodide runtime assets.");
