# CAI

**CAI (Computer AI)** is a Gemini-powered AI coding and computer assistant that lives in your terminal. It can understand your project, create and edit files, run terminal commands, inspect Git state, manage development processes, teach you concepts, and help with game development, coding, work, and everyday tasks.

The goal is simple: **install CAI once, then use it anywhere.**

```text
C:\Projects\MyGame> CAI

╭──────────────────────────────────────╮
│ CAI                                  │
│ Gemini-powered AI Computer Assistant │
╰──────────────────────────────────────╯

CAI > Create a simple game project
```

## Features

- **Global CLI** — install once and run `CAI` from any project folder.
- **Natural language first** — describe what you want instead of memorizing commands.
- **Real local file operations** — read, create, edit, move, rename, delete, and search project files.
- **Terminal execution** — run PowerShell/CMD on Windows and bash/zsh on macOS/Linux.
- **Gemini function calling** — CAI can decide when it needs to use a local tool and continue the agent loop automatically.
- **Project-aware** — the current working directory becomes the project root.
- **Permission system** — SAFE, WARNING, DANGEROUS, and RESTRICTED command classification.
- **Background processes** — start, inspect, and stop long-running development servers.
- **Git awareness** — inspect status, diff, log, and branch information.
- **Project rules** — use `.cai/rules.md` for project-specific instructions.
- **Project memory** — store durable project notes in `.cai/memory.json` while avoiding secrets and credentials.
- **Task planning** — multi-step tasks show progress while CAI works.
- **Learning mode** — ask CAI to teach or guide you instead of doing everything for you.
- **Codebase analysis** — inspect languages, file counts, line counts, and TODO/FIXME markers.
- **Doctor command** — check your CAI environment and configuration with `cai doctor`.

## Requirements

- Node.js 18+
- Python 3.10+ for Python-side utilities
- A Google Gemini API key

Get a Gemini API key from urlGoogle AI Studiohttps://aistudio.google.com/apikey.

## Installation

### Recommended: Install globally from GitHub

You do **not** need to clone CAI into every project.

```bash
npm install -g Reyofficial77/CAI
```

After installation, CAI is available globally:

```bash
CAI
```

or:

```bash
cai
```

### Use CAI in any project

Go to the project you want CAI to work on:

```powershell
cd C:\Projects\MyGame
CAI
```

CAI automatically uses the **current working directory** as its project root.

For example:

```text
C:\Projects\MyGame> CAI
```

means CAI works inside:

```text
C:\Projects\MyGame
```

You can do the same for any project:

```text
C:\Projects\Website> CAI
C:\Projects\RobloxGame> CAI
C:\Projects\PythonApp> CAI
C:\Projects\NodeAPI> CAI
```

### Update CAI

Because CAI is installed from GitHub, update it with:

```bash
npm install -g Reyofficial77/CAI
```

## Gemini API setup

CAI reads your API key from the `GEMINI_API_KEY` environment variable. **Never commit your API key to GitHub.**

### Windows PowerShell

For the current terminal session:

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY"
```

To save it permanently for your Windows user:

```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "YOUR_API_KEY", "User")
```

Then open a new PowerShell window.

### Windows CMD

```cmd
set GEMINI_API_KEY=YOUR_API_KEY
```

### macOS / Linux

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
```

## Model configuration

The default Gemini model is:

```text
gemini-3.8-flash
```

You can override it with:

```powershell
$env:GEMINI_MODEL="gemini-3.8-flash"
```

or:

```bash
cai config set geminiModel gemini-3.8-flash
```

CAI resolves configuration in this order:

```text
Environment variables
        ↓
Persisted CAI configuration
        ↓
Built-in defaults
```

## Usage

Start CAI from any project:

```bash
CAI
```

Then simply describe what you want:

```text
CAI > Create a Python game called Space Survivor.

CAI > Find and fix the error in my project.

CAI > Create a React landing page.

CAI > Run the development server.

CAI > Explain this code to me.

CAI > Check my Git changes.

CAI > Add a save system to the game.

CAI > exit
```

CAI is designed to operate as an **AI agent**, not just a chatbot. When a task requires files or terminal commands, it can use its tools, receive their results, and continue working toward the requested result.

## CLI commands

```bash
cai doctor       # Check environment and configuration
cai config       # View or change configuration
cai init         # Create .cai/rules.md in the current project
cai processes    # List background processes
```

## Permission modes

Configure permissions with:

```bash
cai config set permissionMode <mode>
```

Available modes:

| Mode | Behavior |
|---|---|
| `ask-every-time` | Confirm every non-trivial action |
| `ask-dangerous-only` | Automatically approve SAFE/WARNING actions and ask before DANGEROUS actions |
| `trusted` | Automatically approve everything except RESTRICTED actions |
| `read-only` | Disable file writes and command execution |

The default mode is:

```text
ask-dangerous-only
```

`RESTRICTED` operations are always blocked.

## Project rules

Initialize project-specific instructions:

```bash
cai init
```

This creates:

```text
.cai/
└── rules.md
```

You can put instructions such as:

```text
- Use TypeScript instead of JavaScript.
- Use 2 spaces for indentation.
- Do not modify the database schema.
- Keep the code simple.
```

CAI reads these rules when working in that project.

## Project memory

CAI can maintain lightweight project memory:

```text
.cai/
└── memory.json
```

This allows useful project information to persist between CAI sessions. Secrets and credentials should never be stored there.

## Architecture

```text
                  ┌──────────────────┐
                  │      User        │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │     CAI CLI      │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │    Gemini API    │
                  └────────┬─────────┘
                           │
                    Tool requests
                           │
                           ▼
              ┌────────────────────────┐
              │      CAI Tool Layer    │
              ├────────────────────────┤
              │ Filesystem              │
              │ Terminal                │
              │ Git                     │
              │ Processes               │
              │ Project analysis        │
              └────────────┬───────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  Current Project │
                  └──────────────────┘
```

### Source structure

```text
CAI/
├── apps/
│   └── cli/
│       └── src/
│           ├── agent/       # Agent loop and session handling
│           ├── gemini/      # Gemini client
│           ├── tools/       # Filesystem, terminal, Git, process tools
│           ├── config/      # Configuration
│           ├── ui/          # Terminal UI
│           └── types/
├── python/                  # Python-side utilities
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Development

If you are developing CAI itself instead of installing it globally:

```bash
git clone https://github.com/Reyofficial77/CAI.git
cd CAI
npm install
npm run build
npm start
```

For development mode:

```bash
npm run dev
```

## Global CLI development workflow

When developing the CAI CLI locally, build the project first:

```bash
npm run build
```

Then you can test the generated CLI directly or install the repository globally.

After making changes:

```bash
npm run build
npm install -g .
```

Then from another folder:

```powershell
cd C:\Projects\TestProject
CAI
```

## Security

CAI can execute commands on your machine. Always review permission settings and understand what a requested action will do.

Recommended default:

```text
ask-dangerous-only
```

Never publish:

- `GEMINI_API_KEY`
- passwords
- access tokens
- private keys
- `.env` files containing secrets
- other credentials

## Roadmap

Planned improvements include:

- Streaming Gemini responses
- Better Claude Code-style terminal UI
- Interactive file diffs before applying changes
- More granular tool permissions
- `/help`, `/clear`, `/model`, and `/status` commands
- Session/history management
- Automatic CAI updates
- Better multi-agent workflows
- More development and game-development tools

## License

See the repository license for the current project terms.

---

**CAI — one installation, every project.**
