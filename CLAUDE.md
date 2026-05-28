# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Customer worker for the **"{{ORG_NAME}}" org**, deployed at location `{{LOCATION}}`. Executes org-specific custom steps (e.g. `fetch_data`, `extract_invoice`) for the Cashflowy orchestrator. Polls the orchestrator for tasks and reports completion. Sends `X-Location: {{LOCATION}}` header when polling.

### Related Repositories

This repo is a **customer worker**. The sibling repos live under the same parent directory:

- **`orchestrator.finopsbricks.com`** — The orchestrator (Next.js). Defines processes, manages work records, dispatches tasks to workers, and stores results.
- **`process-engine-core-worker`** — Fobrix-maintained worker that executes built-in step types (`http_request`, etc.).

## Common Development Commands

- **Development**: `npm run dev` — Run worker with `NODE_ENV=development` and file watching. Writes artefacts to `temp/work_records/` for local inspection.
- **Production**: `npm start` — Run worker in production mode.

## Architecture

### Step Handler Pattern

Each step uses `defineStep()` with typed schemas:

```javascript
import { defineStep, attachDocument } from '@fob/lib-worker';
import { z } from 'zod';

export default defineStep({
  slug: 'my_step',
  name: 'My Step',
  description: 'What this step does',

  inputSchema: z.object({}),
  outputSchema: z.object({ field1: z.string(), field2: z.number() }),

  execute: async (config, context) => {
    const { work_record, step } = context;

    // 1. Access previous step outputs by slug
    const prev = work_record.step_outputs['previous_step'];
    if (!prev) {
      throw new Error('Required data not found');
    }

    // 2. Do work (fetch, compute, validate)
    const result = await computeResult(...);

    // 3. Attach supporting document
    await attachDocument(work_record.id, 'Title', markdown, step.slug);

    // 4. Return structured output
    return { field1, field2 };
  },
});
```

### Shared Libraries

- `@fob/lib-worker` — Core worker framework: polling loop, `defineStep()`, orchestrator integration, templates, file/path utils
- `@fob/lib-worker-ai` — LLM structured generation via OpenRouter (`extractDocument()`, `generateStructured()`)
- `@fob/lib-worker-google` — Google Sheets + Drive API wrappers, generic sheet sync engine
- `@fob/lib-worker-llmwhisperer` — LLMWhisperer PDF text extraction API client
- `@fob/lib-worker-erpnext` — ERPNext/Frappe REST client
- `@fob/lib-worker-statements` — statements.finopsbricks.com API client
- `@fob/lib-worker-email` — Email sending via Zepto Mail

### Utilities (`src/utils/`)

- `work-area.js` — Centralized path resolution for all data directories (`dirs`, `processingDir()`)
- `customer.config.js` — Company identity config (name, GSTIN) at project root

## Configuration

Environment variables (see `.env.example`):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ORCHESTRATOR_API_KEY` | Yes | — | Orchestrator API key |
| `ORCHESTRATOR_API_SECRET` | Yes | — | Orchestrator API secret |
| `WORKER_LOCATION` | Yes | — | Location code for task routing (e.g., `{{LOCATION}}`) |
| `ORCHESTRATOR_URL` | No | `http://localhost:4005` | Orchestrator server URL |
| `POLL_INTERVAL_MS` | No | `2000` | Polling frequency (ms) |
| `WORK_AREA_PATH` | No | `<project_root>/work_area` | Root path for all data directories |
| `OPENROUTER_API_KEY` | No | — | OpenRouter API key (for LLM steps) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | — | Base64-encoded Google service account JSON |

## Optional Dependencies

Add these to `package.json` as needed:

```bash
# LLM / AI structured generation
npm install @fob/lib-worker-ai@file:../../lib/lib-worker-ai

# Google Sheets/Drive integration
npm install @fob/lib-worker-google@file:../../lib/lib-worker-google

# PDF text extraction
npm install @fob/lib-worker-llmwhisperer@file:../../lib/lib-worker-llmwhisperer

# ERPNext integration
npm install @fob/lib-worker-erpnext@file:../../lib/lib-worker-erpnext

# Statements app API client
npm install @fob/lib-worker-statements@file:../../lib/lib-worker-statements

# Email sending (Zepto Mail)
npm install @fob/lib-worker-email@file:../../lib/lib-worker-email

# Database (SQLite)
npm install sequelize sqlite3

# PDF generation
npm install md-to-pdf pdf-lib

# Excel generation
npm install exceljs
```

## Documentation

- **FDE Handbook** (`fde-handbook`) — step patterns, process design, capabilities, library APIs
- **Platform Handbook** (`platform-handbook`) — platform architecture, operations, internals
- **CFO Handbook** (`cfo-handbook`) — domain expertise, accounting best practices
- **Engineering Standards** (`engineering-standards`) — JS, testing, git conventions

### Key Standards Applied

- **Variables**: snake_case (e.g., `work_record_id`, `step_outputs`)
- **Functions**: camelCase (e.g., `calculateDailyBalances()`, `attachDocument()`)
- **Step Slugs**: Identity-only, no prefix (e.g., `fetch_data`, `extract_invoice`). Routing handled by `location` field in process definitions
- **ES Modules**: `import`/`export` throughout, `"type": "module"` in package.json
- **Minimal dependencies**: Only `dotenv` — uses native `fetch` for HTTP
