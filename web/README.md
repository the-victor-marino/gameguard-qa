# GameGuard QA Lab

An interactive recruiter-friendly frontend for [GameGuard QA](https://github.com/the-victor-marino/gameguard-qa).

## Run locally

Requires Node.js 22+.

```bash
cd web
npm install
npm run dev
```

Then open the local URL shown by Vite.

The `predev` and `prebuild` scripts automatically copy the **real repository Python source** into `web/public/engine`. Generated files are excluded from Git and should never be hand-edited.

## How the real QA engine works

1. Vite serves the React/TypeScript single-page application.
2. On load, a Web Worker loads a locally hosted Pyodide (browser CPython) runtime.
3. The worker loads the repository's unmodified `game/` and `gameguard/` Python modules from the build-generated manifest.
4. User edits and scenarios go to Python via worker messages; no save content is uploaded to a backend.
5. **Save lab:** `gameguard.save_guard.validator.inspect_save` validates the raw save in a temporary virtual file.
6. **Migration lab:** `migrate_to_current` and `assert_progression_preserved` check legacy saves. Deliberately faulty migrations are injected for teaching purposes.
7. **Performance lab:** `compare_performance` uses deterministic baseline/current values. The numbers are simulated telemetry, *not* real hardware measurements.
8. **Release lab:** `evaluate_quality_gate` and `build_markdown_report` generate an actual decision and Markdown evidence.
9. **Source/test explorers:** build-time snapshots of repository files; GitHub links show the source of truth. The explorer documents the 30 executed pytest cases, including parametrized boundary values. It does *not* pretend to run pytest in the browser.

The browser demo's release quality gate aggregates **save integrity and performance**. Migration correctness is a separate automated regression layer executed in CI.

## Production build

```bash
npm run verify
npm run build
npm run preview
```

## Deploy

The repository includes `.github/workflows/deploy-web.yml` with a GitHub Pages build and deployment pipeline. A repo administrator must first configure **Settings → Pages → Build and deployment: GitHub Actions**. Pushes to `main` that change the app or engine then deploy to:

https://the-victor-marino.github.io/gameguard-qa/

If Pages is not enabled, the website's build job may pass while its deployment job cannot publish; this is a GitHub repository setting rather than a frontend error.

## Important constraints

- Pyodide is hosted alongside the site; loading it requires downloading the browser Python/WASM assets on first visit.
- The demo models a small RPG persistence pipeline, *not* a production engine integration.
- Tests run using pytest in GitHub Actions; the interactive website executes the production Python QA modules, not the full pytest suite.
- The HTML/JS UI is a teaching and inspection layer. GameGuard's Python sources remain the source of truth.

Stack: React, TypeScript, Vite, Pyodide, GitHub Actions and GitHub Pages.
