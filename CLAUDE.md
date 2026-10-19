# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The **"{{ORG_NAME}}" factory**: the lines and stations for the `{{ORG_NAME}}` org on
[Assembly Line](https://assemblyline.sh). `npm start` runs a factory session at location
`{{LOCATION}}`: it polls the Orchestrator for steps of lines at that location, runs them, and
reports back.

See `README.md` for setup instructions.

### Related Repositories

- **Orchestrator** (`https://orchestrator.assemblyline.sh`) — holds line and station
  definitions, dispatches steps to factory sessions, keeps a work record of every run.
- **[`@assemblyline/lib-factory`](https://github.com/assemblyline-sh/lib-factory)** — the
  runtime: `defineStep()`, `discoverSteps()`, `startFactory()`, the orchestrator client, the
  conveyor step, workpiece and template helpers.
- **`factory`** — ships with lib-factory: `npx factory steps list` and
  `npx factory steps run <slug>` run this repo's steps locally (`npm run step -- <slug>`).
- **`al-control`** — the control room CLI: lines, stations, workpieces and processes, in
  this repo with `-f .` or on any host (`npm install -g @assemblyline/al-control`).
- **`al-orc`** — CLI for the Orchestrator: push and pull line and station definitions, run
  stations, read work records.

## Common Development Commands

- **Development**: `npm run dev` — factory session with `NODE_ENV=development` and file
  watching. Bins live under `temp/stations/{STATION}/{input,doing,output,done,failed}/`.
- **Production**: `npm start`
- **Tests**: `npm test` — Jest (`tests/**/*.test.js`)
- **Type check**: `npm run typecheck` — JSDoc types via `jsconfig.json`

## Architecture

### Vocabulary

- **Factory** — this repo's lines and stations. A repo can hold lines at several
  locations; each factory session runs only its own location's lines.
- **Factory session** — the running process (`npm start`) at one location. At most one per
  org and location.
- **Line** — a sequence of stations that together run one SOP (e.g. `EX`). Defined in
  `.orchestrator/lines/{LINE}.json`; owns the `location`.
- **Station** — one job on a line, with a `short_code` (e.g. `EX1`), a `line`, and a sequence
  of `steps`. Defined in `.orchestrator/stations/{STATION}__{name}.json`.
- **Step** — one handler within a station, defined via `defineStep()`. Steps in a station
  share `step_outputs` within one work record.
- **Workpiece** — one unit of work: a folder with a `pointer.json`, moving through bins.
- **Conveyor** — step 0 of every non-head station is `lib-factory:move_files`, pulling
  workpieces from the upstream station's `output` bin.

### Step Folder Convention

Steps live under `src/steps/{SHORT_CODE}__{station_slug}/`. Each handler file is
`{SHORT_CODE}_{NN}_{name}.js` and exports a `defineStep()` with a matching slug. EJS templates
(`report.md`, `*.prompt.md`) sit next to their handler. Execution order comes from the station
JSON's `steps[]` array, not from file numbering.

### Step Handler Pattern

See `src/steps/EX1__count_words/EX1_01_count_words.js` for a per-workpiece station and
`src/steps/EX0__intake/EX0_01_intake.js` for a line-head.

```javascript
import { defineStep, attachReport, attachWorkpieces, bin, listWorkpieces, processWorkpiece, renderLocal } from '@assemblyline/lib-factory';
import { z } from 'zod';

export default defineStep({
  slug: 'MY1_01_do_thing',
  name: 'Do thing',
  description: 'What this step does',
  inputSchema: z.object({}),
  outputSchema: z.object({ done_count: z.number(), failed_count: z.number() }),

  execute: async (config, { work_record }) => {
    const workpieces = {};
    for (const workpiece_id of listWorkpieces(bin('MY1', 'input'))) {
      const run = await processWorkpiece({
        station: 'MY1',
        workpiece_id,
        work_record_id: work_record.id,
        body: async (wp_doing) => { /* read and write files in wp_doing; throw to fail */ },
      });
      workpieces[workpiece_id] = run.status === 'ok' ? 'done' : 'failed';
    }
    await attachWorkpieces(work_record.id, workpieces);
    await attachReport(work_record.id, renderLocal(import.meta.url, './report.md', { workpieces }));
    const failed_count = Object.values(workpieces).filter((s) => s === 'failed').length;
    return { done_count: Object.keys(workpieces).length - failed_count, failed_count };
  },
});
```

### Line and Station JSON

```json
{ "code": "MY", "name": "My line", "description": "…", "location": "{{LOCATION}}" }
```

```json
{
  "short_code": "MY1",
  "line": "MY",
  "name": "do_thing",
  "is_enabled": true,
  "watch_enabled": true,
  "dependencies": ["MY0"],
  "steps": [
    { "slug": "lib-factory:move_files", "config": { "source_bin": "MY0/output", "target_bin": "MY1/input" } },
    { "slug": "MY1_01_do_thing", "config": {} }
  ]
}
```

Push with `al-orc lines push --all && al-orc stations push --all`. A file without an `id` is
created and rewritten with the id the Orchestrator assigns.

## Configuration

Environment variables (see `.env.example`):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ORCHESTRATOR_API_KEY` | Yes | — | Orchestrator API key |
| `ORCHESTRATOR_API_SECRET` | Yes | — | Orchestrator API secret |
| `FACTORY_LOCATION` | Yes | — | Where this session runs (e.g. `{{LOCATION}}`); sent as `X-Location` |
| `ORCHESTRATOR_URL` | No | `http://localhost:3000` | Use `https://orchestrator.assemblyline.sh` for the hosted Orchestrator |
| `POLL_INTERVAL_MS` | No | `2000` | Polling frequency (ms) |

## Debugging Steps Locally

```bash
npx factory steps list
npx factory steps run MY1_01_do_thing --station MY1   # output saved to temp/
npx factory steps run MY1_02_next --scenario small    # reads MY1_01's output from temp/
al-control lines status MY -f .
al-control workpieces watch <id> -f .
```

## Key Standards Applied

- **Variables**: snake_case (e.g., `work_record_id`, `step_outputs`)
- **Functions**: camelCase (e.g., `attachDocument()`)
- **Step slugs**: `{SHORT_CODE}_{NN}_{name}` (e.g., `EX1_01_count_words`)
- **ES Modules**: `import`/`export` throughout, `"type": "module"` in package.json
- **Type checking**: JSDoc + `// @ts-check`
- **Tests**: Jest, ESM (`--experimental-vm-modules`)
- **Station design**: deterministic checks before AI; one narrow decision per AI step;
  attach a report at each station
