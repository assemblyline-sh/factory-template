# worker-template

A template for a FinOpsBricks Orchestrator worker: a Node.js process that polls the Orchestrator for work and runs your step handlers. Built on [`@fob/lib-worker`](https://github.com/finopsbricks/lib-worker). Follow the steps below to create a new worker from this template.

## How to create a new worker

### 1. Copy and rename

```bash
cp -r worker-template worker-<org_name>
cd worker-<org_name>
```

### 2. Initialize git

```bash
rm -rf .git
git init
```

### 3. Find and replace placeholders

Replace all template placeholders throughout the project:

| Placeholder | Replace with | Example |
|---|---|---|
| `{{ORG_NAME}}` | Your org identifier (lowercase) | `acme` |
| `{{LOCATION}}` | Worker location for orchestrator routing | `acme` |
| `{{WORKER_NAME}}` | `worker-<org_name>` | `worker-acme` |
| `{{WORKER_DESCRIPTION}}` | Short description | `Worker for the acme org` |

```bash
# macOS
grep -rl '{{ORG_NAME}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{ORG_NAME}}/your_org/g'
grep -rl '{{LOCATION}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{LOCATION}}/your_org/g'
grep -rl '{{WORKER_NAME}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{WORKER_NAME}}/worker-your_org/g'
grep -rl '{{WORKER_DESCRIPTION}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{WORKER_DESCRIPTION}}/Worker for the your_org org/g'
```

### 4. Set up environment

```bash
cp .env.example .env
# Fill in credentials in .env
```

### 5. Install dependencies

```bash
npm install
```

### 6. Start building

- Add step handlers in `src/steps/{SHORT_CODE}__{station_slug}/` using the `defineStep()` pattern (see CLAUDE.md)
- Add station JSONs in `.orchestrator/stations/{STATION}.json` and push with `fob-orc stations push --all`
- Add optional libraries as needed (see "Shared Libraries" in CLAUDE.md)
- Run with `npm run dev` during development

### 7. Update this README

Replace this setup guide with a standard worker readme:

```markdown
# {{WORKER_NAME}}

{{WORKER_DESCRIPTION}}. See [CLAUDE.md](CLAUDE.md) for architecture and development details.

## Quick Start

\```bash
npm install
cp .env.example .env  # fill in credentials
npm run dev
\```
```

## Template contents

```
├── CLAUDE.md                  # Worker documentation (has placeholders)
├── README.md                  # This file
├── package.json               # Dependencies and scripts (has placeholders)
├── jsconfig.json              # JSDoc type-checking (checkJs: true)
├── jest.config.cjs            # Jest config (ESM, 80% coverage targets)
├── .env.example               # Environment variable template
├── .gitignore
├── src/
│   ├── index.js               # Worker entry point (polls orchestrator, runs steps)
│   └── steps/                 # Verb-step folders go here
├── tests/                     # Jest tests
├── .orchestrator/
│   └── stations/              # Station JSON definitions (push with `fob-orc stations push --all`)
├── docs/                      # Documentation
└── scripts/                   # Utility scripts (one-shot tools, backfills)
```

`temp/` is created at runtime and gitignored — that's where bins live (`temp/stations/{STATION}/{input,doing,output,done,failed}/`).
