export type Issue = { code: string; severity: string; message: string; path: string };
export type SaveResult = { safe: boolean; issues: Issue[]; critical: number };
export type Metric = { name: string; baseline: number; current: number; budget: number; regression_percent: number; passed: boolean };
export type PerformanceResult = { passed: boolean; metrics: Metric[] };
export type MigrationResult = { passed: boolean; before: Record<string, unknown>; after: Record<string, unknown> | null; error: string | null };
export type ReleaseResult = { passed: boolean; save_safe: boolean; performance_passed: boolean; blockers: string[]; report: string };

type Message = { type: string; id?: number; result?: unknown; error?: string; detail?: string };
type Pending = { resolve: (value: unknown) => void; reject: (reason: Error) => void };
let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, Pending>();
let starting: Promise<void> | null = null;

export function initializeEngine(onProgress?: (message: string) => void): Promise<void> {
  if (starting) return starting;
  starting = new Promise<void>((resolve, reject) => {
    worker = new Worker(new URL("./pyodide.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<Message>) => {
      const msg = event.data;
      if (msg.type === "progress") { onProgress?.(msg.detail || "Loading…"); return; }
      if (msg.type === "ready") { resolve(); return; }
      if (msg.type === "init-error") { reject(new Error(msg.error || "Failed to load Python.")); return; }
      if (typeof msg.id === "number") {
        const waiter = pending.get(msg.id);
        if (!waiter) return;
        pending.delete(msg.id);
        if (msg.type === "result") waiter.resolve(msg.result);
        else waiter.reject(new Error(msg.error || "Python execution failed."));
      }
    };
    worker.onerror = (event) => reject(new Error(event.message || "Web worker failed."));
    worker.postMessage({ type: "init", baseUrl: new URL(import.meta.env.BASE_URL, location.origin).href });
  });
  starting.catch(() => { worker?.terminate(); worker = null; starting = null; });
  return starting;
}

export async function runEngine<T>(action: "save" | "migration" | "performance" | "release", payload: Record<string, unknown>): Promise<T> {
  await initializeEngine();
  return new Promise<T>((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    worker!.postMessage({ type: "run", id, action, payload });
  });
}

export function shutdownEngine(): void {
  worker?.terminate(); worker = null; starting = null;
  for (const p of pending.values()) p.reject(new Error("Engine stopped."));
  pending.clear();
}
