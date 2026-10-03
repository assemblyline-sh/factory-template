# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Customer worker for the **"{{ORG_NAME}}" org**, deployed at location `{{LOCATION}}`. Executes org-specific custom steps for the FinOpsBricks Orchestrator. Polls the orchestrator for tasks and reports completion. Sends `X-Location: {{LOCATION}}` header when polling.

See `README.md` for setup instructions.

### Related Repositories

- **FinOpsBricks Orchestrator** — defines stations and lines, dispatches tasks to workers, stores work records. This worker polls it for tasks.
- **[`@fob/lib-worker`](https://github.com/finopsbricks/lib-worker)** — shared worker infrastructure. Provides `defineStep()`, `discoverSteps()`, `startWorker()`, the orchestrator client, conveyor steps and template helpers.
- **[`fob-worker`](https://www.npmjs.com/package/@finopsbricks/fob-worker)** — CLI for running and debugging steps locally and watching lines, stations and workpieces.
- **[`fob-orc`](https://www.npmjs.com/package/@finopsbricks/fob-orc)** — CLI for pulling and pushing station definitions to the Orchestrator.

## Common Development Commands

- **Development**: `npm run dev` — Run worker with `NODE_ENV=development` and file watching. Bins live under `temp/stations/{STATION}/{input,doing,output,done,failed}/`.
- **Production**: `npm start` — Run worker in production mode.
- **Tests**: `npm test` — Run Jest tests (`tests/**/*.test.js`).
- **Type check**: `npm run typecheck` — Validates JSDoc types via `jsconfig.json` (`checkJs: true`).

## Architecture

### Vocabulary

- **Line** — a sequence of one or more stations that together perform a business workflow (e.g. AP, VM).
- **Station** — one orchestrator process. Has a `short_code` (e.g. `P8`, `VM3`, `AP2`), a `line`, and a sequence of `steps`. Defined in `.orchestrator/stations/{STATION}.json`.
- **Verb-step** — one handler within a station, defined via `defineStep()`. Sequential steps in a single station share in-memory `step_outputs` against one work record.
- **Conveyor** — multi-station lines pass workpiece bundles via filesystem bins (`temp/stations/{STATION}/{input,doing,output,done,failed}/`). Step 0 of every non-head station is `lib-worker:move_files` pulling from the upstream station's `output/done` bins.

### Step Folder Convention

Verb-steps live under `src/steps/{SHORT_CODE}__{station_slug}/`. Each handler file is `{SHORT_CODE}_{NN}_{name}.js` and exports a `defineStep()` with matching slug. EJS templates (`report.md`, `*.prompt.md`, `*.doc.md`) co-locate with their handler. Execution order comes from the station JSON's `steps[]` array, not from file numbering.

### Step Handler Pattern

```javascript
import { defineStep, attachReport, renderLocal } from '@fob/lib-worker';
import { z } from 'zod';

export default defineStep({
  slug: 'MY1_01_do_thing',
  name: 'Do thing',
  description: 'What this step does',

  inputSchema: z.object({}),
  outputSchema: z.object({ result_count: z.number() }),

  execute: async (config, context) => {
    const { work_record, step } = context;

    // 1. Access previous step outputs by slug
    const prev = work_record.step_outputs['MY1_00_fetch_data'];

    // 2. Do work
    const result = await computeResult(prev);

    // 3. Attach co-located EJS report
    const markdown = renderLocal(import.meta.url, './report.md', result);
    await attachReport(work_record.id, 'Result summary', markdown, step.slug);

    // 4. Return structured output
    return { result_count: result.items.length };
  },
});
```

### Station JSON

```json
{
  "short_code": "MY1",
  "line": "MY",
  "name": "do_thing",
  "is_enabled": true,
  "location": "{{LOCATION}}",
  "schedule_cron": "*/5 * * * *",
  "schedule_enabled": true,
  "steps": [
    { "slug": "lib-worker:move_files", "config": { "source_bin": "MY0/output", "target_bin": "MY1/input" } },
    { "slug": "MY1_01_do_thing", "config": {} }
  ]
}
```

Push stations with `fob-orc stations push --all`.

### Shared Libraries

Always installed:

- `@fob/lib-worker` — Core worker framework: polling loop, `defineStep()`, `discoverSteps()`, orchestrator client (`attachDocument`, `attachReport`, `findItemByExternalId`, `createItem`, `findOrCreateItem`, `runProcess`), conveyor steps (`moveFilesStep`, `splitBundlesStep`), template helper (`renderLocal`).

Optional — add to `package.json` as needed. These repositories are currently private; ask FinOpsBricks for access:

```bash
# LLM structured generation via OpenRouter
npm install @fob/lib-worker-ai@github:finopsbricks/lib-worker-ai#v0.1.0

# Google Sheets + Drive
npm install @fob/lib-worker-google@github:finopsbricks/lib-worker-google#v0.1.0

# PDF text extraction
npm install @fob/lib-worker-llmwhisperer@github:finopsbricks/lib-worker-llmwhisperer#v0.4.0

# ERPNext / Frappe REST client
npm install @fob/lib-worker-erpnext@github:finopsbricks/lib-worker-erpnext#v0.1.0

# Email sending (Zepto Mail)
npm install @fob/lib-worker-email@github:finopsbricks/lib-worker-email#v0.1.0

# statements.finopsbricks.com client
npm install @fob/lib-worker-statements@github:finopsbricks/lib-worker-statements#v0.1.0
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ORCHESTRATOR_API_KEY` | Yes | — | Orchestrator API key |
| `ORCHESTRATOR_API_SECRET` | Yes | — | Orchestrator API secret |
| `WORKER_LOCATION` | Yes | — | Location code for task routing (e.g., `{{LOCATION}}`) — sent as `X-Location` header |
| `ORCHESTRATOR_URL` | No | `http://localhost:3000` | Orchestrator server URL |
| `POLL_INTERVAL_MS` | No | `2000` | Polling frequency (ms) |

## Debugging Steps Locally

Use the `fob-worker` CLI (`npm install -g @finopsbricks/fob-worker`):

```bash
# List available steps
fob-worker steps list

# Run one step (output saved to temp/)
fob-worker steps run {{LOCATION}}/MY1__do_thing/MY1_01_do_thing

# Watch a line / station / workpiece
fob-worker lines status MY
fob-worker workpieces watch <id>
```

## Key Standards Applied

- **Variables**: snake_case (e.g., `work_record_id`, `step_outputs`)
- **Functions**: camelCase (e.g., `calculateDailyBalances()`, `attachDocument()`)
- **Verb-step slugs**: `{SHORT_CODE}_{NN}_{name}` (e.g., `AP2_01_extract`)
- **ES Modules**: `import`/`export` throughout, `"type": "module"` in package.json
- **Type checking**: JSDoc + `@ts-check` enforced via `jsconfig.json` (`checkJs: true`)
- **Tests**: Jest, ESM (`--experimental-vm-modules`), 80% coverage targets
- **Station design**: Deterministic checks before LLM analysis; attach supporting documents at each verb-step

## Communication Style Guidelines

### Critical Thinking Expected
- Evaluate suggestions objectively — don't default to agreement
- Question technical decisions — ask about trade-offs, alternatives, and implications
- Point out potential issues — identify risks, complexity, or better approaches

### Avoid Excessive Praise
- Focus on technical merit rather than praise
- Be direct and honest — if something seems problematic, say so
