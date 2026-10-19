# factory-template

The starter for an [Assembly Line](https://assemblyline.sh) factory: a repo of lines and
stations whose steps run in a factory session against the Orchestrator. Built on
[`@assemblyline/lib-factory`](https://github.com/assemblyline-sh/lib-factory). It ships one
example line, `EX`, that turns text files into workpieces and counts their words.

## How to create a new factory

### 1. Copy and rename

```bash
cp -r factory-template factory-<name>
cd factory-<name>
```

### 2. Initialize git

```bash
rm -rf .git
git init
```

### 3. Find and replace placeholders

| Placeholder | Replace with | Example |
|---|---|---|
| `{{ORG_NAME}}` | Your org identifier (lowercase) | `acme` |
| `{{LOCATION}}` | Where this factory runs; lines at this location run here | `acme-office` |
| `{{FACTORY_NAME}}` | `factory-<name>` | `factory-acme` |
| `{{FACTORY_DESCRIPTION}}` | Short description | `Factory for the acme org` |

```bash
# macOS
grep -rl '{{ORG_NAME}}' . --exclude-dir=node_modules | xargs sed -i '' 's/{{ORG_NAME}}/acme/g'
grep -rl '{{LOCATION}}' . --exclude-dir=node_modules | xargs sed -i '' 's/{{LOCATION}}/acme-office/g'
grep -rl '{{FACTORY_NAME}}' . --exclude-dir=node_modules | xargs sed -i '' 's/{{FACTORY_NAME}}/factory-acme/g'
grep -rl '{{FACTORY_DESCRIPTION}}' . --exclude-dir=node_modules | xargs sed -i '' 's/{{FACTORY_DESCRIPTION}}/Factory for the acme org/g'
```

### 4. Set up environment

```bash
cp .env.example .env
# Fill in the orchestrator API key and secret
```

### 5. Install dependencies

```bash
npm install
```

### 6. Run the example line

```bash
al-orc lines push --all && al-orc stations push --all   # creates EX, EX0, EX1
npm run dev                                             # starts a factory session
al-orc stations run EX0                                 # seeds 3 workpieces from samples/
al-factory lines status EX                              # watch them move: 2 done, 1 failed
```

`samples/empty.txt` is empty on purpose: it fails the word count and lands in
`temp/stations/EX1/failed/` with its error. EX0 runs only when you start it, so the factory
session warns at start that nothing triggers EX0; EX1 starts by itself when EX0's output has
workpieces. Delete the `EX` line, its steps and `samples/`
when you add your own.

### 7. Start building

- Add step handlers in `src/steps/{SHORT_CODE}__{station_slug}/` using `defineStep()` (see
  CLAUDE.md)
- Add line and station JSONs in `.orchestrator/lines/` and `.orchestrator/stations/`, and
  push them with `al-orc lines push --all && al-orc stations push --all`
- Run one step on its own: `npx factory steps run <slug> --station <CODE>` (output in
  `temp/<slug>.json`; attachments stay in `temp/work_records/`)
- Run with `npm run dev` during development

### 8. Update this README

Replace this setup guide with a short factory readme:

```markdown
# {{FACTORY_NAME}}

{{FACTORY_DESCRIPTION}}. See [CLAUDE.md](CLAUDE.md) for architecture and development details.

## Quick Start

\```bash
npm install
cp .env.example .env  # fill in credentials
npm run dev
\```
```

## Template contents

```
├── CLAUDE.md                  # Factory documentation (has placeholders)
├── README.md                  # This file
├── .env.example               # Environment variables
├── .orchestrator/
│   ├── lines/EX.json          # Example line
│   └── stations/              # EX0 (intake) and EX1 (count words)
├── samples/                   # Input for the example line
├── src/
│   ├── index.js               # Entry point: factory session + bin watcher
│   └── steps/                 # One folder per station
├── tests/example-line.test.js # Runs the example line end to end
├── docs/
└── scripts/
```

`temp/` is created at runtime and gitignored. Bins live there:
`temp/stations/{STATION}/{input,doing,output,done,failed}/`.
