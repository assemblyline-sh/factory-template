# worker-template

This is a template for creating new customer workers. Follow the steps below to create a new worker from this template.

## How to create a new worker

### 1. Copy and rename

```bash
cp -r worker-template worker-<org_name>
cd worker-<org_name>
```

### 2. Initialize git

```bash
git init
```

### 3. Find and replace placeholders

Replace all template placeholders throughout the project:

| Placeholder | Replace with | Example |
|---|---|---|
| `{{ORG_NAME}}` | Your org identifier (lowercase) | `emiritus` |
| `{{WORKER_NAME}}` | `worker-<org_name>` | `worker-emiritus` |
| `{{WORKER_DESCRIPTION}}` | Short description | `Customer worker for emiritus org` |

```bash
# macOS
grep -rl '{{ORG_NAME}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{ORG_NAME}}/your_org/g'
grep -rl '{{WORKER_NAME}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{WORKER_NAME}}/worker-your_org/g'
grep -rl '{{WORKER_DESCRIPTION}}' . --include='*.js' --include='*.json' --include='*.md' | xargs sed -i '' 's/{{WORKER_DESCRIPTION}}/Customer worker for your_org org/g'
```

### 4. Fill in customer config

Edit `customer.config.js` with the customer's company details (name, GSTIN, address, etc.).

### 5. Set up environment

```bash
cp .env.example .env
# Fill in credentials in .env
```

### 6. Install dependencies

```bash
npm install
```

### 7. Start building

- Add step handlers in `src/steps/` using the `defineStep()` pattern (see CLAUDE.md)
- Add optional dependencies as needed (see "Optional Dependencies" in CLAUDE.md)
- Run with `npm run dev` during development

### 8. Update this README

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
├── CLAUDE.md              # Worker documentation (has placeholders)
├── customer.config.js     # Company identity config (TODO fields)
├── package.json           # Dependencies and scripts (has placeholders)
├── .env.example           # Environment variable template
├── src/
│   ├── index.js           # Standard worker entry point
│   ├── steps/             # Step handlers go here
│   ├── templates/         # EJS templates for reports/documents
│   └── utils/
│       ├── ai.js              # LLM structured generation helpers
│       ├── orchestrator-api.js # Orchestrator REST client
│       ├── render-local.js    # EJS template rendering
│       └── work-area.js      # File path resolution
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── temp/                  # Local dev artefacts (gitignored)
```
