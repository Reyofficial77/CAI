# CAI

<<<<<<< HEAD
**CAI (Computer AI)** is a Gemini-powered AI terminal assistant designed for coding, game development, learning, work, and general computer-assisted tasks.

CAI works directly inside your project directory and can understand your project, create and edit files, create folders, execute terminal commands, and assist with development workflows.

## Features

* 🤖 Gemini-powered AI assistant
* 💻 Runs directly inside your terminal
* 📁 Creates files and folders
* ✏️ Reads, writes, and edits project files
* ⚡ Executes terminal commands
* 🎮 Useful for game development
* 🧑‍💻 Coding and software development assistance
* 📚 Learning and explanation mode
* 💼 Work and productivity assistance
* 🧠 Project-aware context
* 📋 Task planning
* 🔐 Permission controls for potentially dangerous commands
* 🎨 Claude Code-inspired terminal UI
* 🌐 Global CLI installation

## Requirements

* Node.js 20 or newer
* npm
* A Google Gemini API key

## Installation

Install CAI globally from npm:

```bash
npm install -g cai-ai
```

After installation, you can use CAI from any project directory:
=======
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
>>>>>>> 88cd2893ccfa01b8ab8ca1eac54ca1905bfb44c6

```bash
cai
```

<<<<<<< HEAD
CAI automatically uses the directory where you launch it as the project root.

For example:

```bash
cd my-project
cai
```

CAI will work inside `my-project`.

## Gemini API Key

CAI requires a Google Gemini API key.

Create a `.env` file in your project or configure your environment:

```env
GEMINI_API_KEY=your_api_key_here
```

Never commit your API key to GitHub.

You can use `.env.example` as a template.

## Model Configuration

CAI supports configurable Gemini models.

Example:

```bash
cai config set geminiModel "gemini-3.7-flash"
```

Check the current configuration:

```bash
cai config get geminiModel
```

## CLI

Start CAI:

```bash
cai
```

Once CAI is running, simply describe what you want:

```text
CAI > Create a login page for my project
```

CAI can inspect the project and determine which files need to be created or modified.

You can also ask it to execute commands:

```text
CAI > Install the project dependencies and start the development server
```

## Permission Modes

CAI includes permission controls for terminal operations.
=======
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
>>>>>>> 88cd2893ccfa01b8ab8ca1eac54ca1905bfb44c6

The default mode is:

```text
ask-dangerous-only
```

<<<<<<< HEAD
This allows normal operations while requesting confirmation for potentially dangerous commands.

## Project Rules

You can add project-specific instructions using:

```text
.cai/rules.md
```

Example:

```md
# Project Rules

- Use TypeScript.
- Keep code readable and compact.
- Do not create unnecessary files.
- Follow the existing project structure.
```

CAI can use these rules while working inside the project.

## Project Memory

CAI can maintain project-aware context so that it can better understand the structure and purpose of an existing project.

This allows CAI to work more naturally on multi-step development tasks.

## Example Tasks

### Coding

```text
CAI > Create an authentication system with login and registration.
```

### Debugging

```text
CAI > Find and fix the error in this project.
```

### Game Development

```text
CAI > Create the player movement system for this game.
```

### File Management

```text
CAI > Create a new config folder and add a development configuration file.
```

### Terminal

```text
CAI > Install the dependencies and run the project.
```

### Learning

```text
CAI > Explain how this project works and teach me what each important file does.
```

## Development

Clone the repository:

```bash
git clone https://github.com/Reyofficial77/CAI.git
cd CAI
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run the development version:

```bash
npm run dev
```

Run the compiled version:

```bash
npm start
```

## Publishing

CAI is distributed through npm.

To create a package locally:

```bash
npm pack
```

To publish a new version:

```bash
npm version patch
npm publish --access public
```

## Project Structure
=======
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
>>>>>>> 88cd2893ccfa01b8ab8ca1eac54ca1905bfb44c6

```text
CAI/
├── apps/
│   └── cli/
│       └── src/
<<<<<<< HEAD
│           ├── agent/
│           ├── tools/
│           ├── ui/
│           └── index.ts
├── dist/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Security

CAI can execute commands on your computer. Review commands carefully when CAI asks for permission, especially commands that can modify or delete files, install software, or change system configuration.

Never expose your Gemini API key.

Do not commit `.env` files containing secrets.
=======
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
>>>>>>> 88cd2893ccfa01b8ab8ca1eac54ca1905bfb44c6

## Roadmap

Planned improvements include:

<<<<<<< HEAD
* Better agent planning
* More powerful project context
* Improved file editing
* More tools
* Better command execution controls
* Improved error recovery
* Additional Gemini model support
* More development workflows
* Better terminal UI
* Cross-platform improvements

## License

This project is currently under active development.

---

**CAI — Your AI assistant in the terminal.**
=======
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
>>>>>>> 88cd2893ccfa01b8ab8ca1eac54ca1905bfb44c6
