# CAI

**CAI (Computer AI)** is a Gemini-powered AI terminal assistant designed for coding, game development, learning, work, and general computer-assisted tasks.

CAI works directly inside your project directory. It can understand your project, inspect files, create and edit files, execute terminal commands, inspect Git information, manage development processes, and assist you through multi-step development tasks.

The goal is simple:

> **Install CAI once, then use it anywhere.**

## Features

* 🤖 **Gemini-powered AI** — Uses the Google Gemini API as its AI engine.
* 💻 **Terminal-first interface** — Interact with CAI directly from your terminal.
* 📁 **Project-aware** — Uses the directory where CAI is launched as the project root.
* ✏️ **File operations** — Read, create, edit, and manage project files.
* ⚡ **Terminal execution** — Run commands directly through CAI.
* 🔧 **Development assistance** — Useful for coding, debugging, and project development.
* 🎮 **Game development** — Designed to assist with game-development workflows.
* 📚 **Learning** — Ask CAI to explain concepts, code, and projects.
* 💼 **Work assistance** — Useful for productivity and general computer-assisted tasks.
* 🌿 **Git awareness** — CAI can inspect Git repository information when needed.
* 🧠 **Project memory** — Store useful project information in `.cai/memory.json`.
* 📋 **Project rules** — Define project-specific instructions with `.cai/rules.md`.
* 🔐 **Permission system** — Control how CAI handles potentially dangerous operations.
* 🗂️ **Session management** — Switch between previous sessions.
* ♻️ **Session recovery** — Recover previous session history into a new session.
* 🌐 **Global CLI** — Install CAI once and use it from any project directory.

## Requirements

* Node.js 18 or newer
* npm
* A Google Gemini API key

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Installation

Install CAI globally from npm:

```bash
npm install -g cai-ai
```

After installation, CAI can be started from any project directory:

```bash
cd C:\Projects\MyProject
cai
```

You can also use:

```bash
CAI
```

CAI uses the directory where it was launched as the project root.

For example:

```text
C:\Projects\Website> cai
```

CAI will work inside:

```text
C:\Projects\Website
```

You can use CAI in any project:

```text
C:\Projects\Website> cai
C:\Projects\RobloxGame> cai
C:\Projects\PythonApp> cai
C:\Projects\NodeAPI> cai
```

## Gemini API Key

CAI requires a Google Gemini API key.

### Windows PowerShell

For the current terminal session:

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY"
```

To save the API key permanently for your Windows user:

```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "YOUR_API_KEY", "User")
```

After setting the permanent environment variable, open a new PowerShell window.

### Windows CMD

```cmd
set GEMINI_API_KEY=YOUR_API_KEY
```

### macOS / Linux

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
```

Never commit your Gemini API key to GitHub.

Do not commit:

* `.env`
* API keys
* passwords
* access tokens
* private keys
* other credentials

## Model Configuration

CAI supports configurable Gemini models.

Set the Gemini model with:

```bash
cai config set geminiModel gemini-3.6-flash
```

Check the current model:

```bash
cai config get geminiModel
```

The active model is displayed when CAI starts.

Example:

```text
╭──────────────────────────╮
│ ✳ CAI   gemini-3.6-flash │
╰──────────────────────────╯
```

## CLI Interface

CAI uses a compact terminal interface designed to keep the terminal focused on the current task.

When CAI starts, it displays the CAI name, active Gemini model, project root, permission mode, and current session.

Example:

```text
╭──────────────────────────╮
│ ✳ CAI   gemini-3.6-flash │
╰──────────────────────────╯

  C:\Projects\MyProject   ·   ask-dangerous-only

Session: session-xxxxxxxxxxxx-xxxxx
Type /help for commands, or just start typing.

╭────────────────────────────────────────────────────────────────────────────╮
│ ❯                                                                          │
╰────────────────────────────────────────────────────────────────────────────╯
  ? for shortcuts
```

The `❯` prompt is the main input area.

Simply type what you want CAI to do.

Example:

```text
❯ Create a portfolio website for this project
```

You do not need to memorize complex commands for normal tasks.

## Shortcuts

Type:

```text
?
```

to view available input shortcuts.

CAI also displays:

```text
? for shortcuts
```

below the input area.

## Help

Use:

```text
/help
```

to view available CAI commands.

## Tool Activity

CAI can use tools when a task requires access to your project or system.

Tool activity is displayed directly in the terminal.

Example:

```text
→ inspect_project
✓ inspect_project

→ git_status
✓ git_status
```

The arrow indicates that CAI is executing a tool.

The check mark indicates that the tool completed successfully.

This allows you to see what CAI is doing without exposing the model's internal reasoning.

## Usage

Start CAI:

```bash
cai
```

Then describe your task:

```text
❯ Create a simple portfolio website for my project.
```

CAI can inspect the project and determine which tools are required.

### Coding

```text
❯ Create an authentication system with login and registration.
```

### Debugging

```text
❯ Find and fix the error in this project.
```

### Game Development

```text
❯ Create a player movement system for this game.
```

### File Management

```text
❯ Create a config folder and add a development configuration file.
```

### Terminal

```text
❯ Install the dependencies and run the project.
```

### Learning

```text
❯ Explain how this project works and teach me what each important file does.
```

### Git

```text
❯ Check the current Git status.
```

## Sessions

CAI supports session history so previous work can be accessed again.

Every CAI session receives a unique session ID.

Example:

```text
Session: session-1789267606860-h42tvf
```

### Switch Sessions

Use:

```text
/session
```

CAI opens an interactive session picker.

Use:

* `↑` to move up
* `↓` to move down
* `Enter` to select a session
* `Esc` to cancel

Example:

```text
╭─ Previous Sessions ─────────────────────╮
│                                         │
│ ❯ New session                            │
│   session-xxxxxxxxxxxx-xxxxx             │
│   session-xxxxxxxxxxxx-xxxxx             │
│                                         │
╰─────────────────────────────────────────╯

↑ ↓ select • Enter open • Esc cancel
```

### Session Recovery

Use:

```text
/sessionRecovery
```

Session recovery allows you to recover the history of a previous session into a **new active session**.

This allows you to continue previous work without replacing the original session.

## Permission Modes

CAI includes permission controls for terminal and potentially dangerous operations.

Configure the permission mode with:

```bash
cai config set permissionMode <mode>
```

Available modes:

| Mode                 | Behavior                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| `ask-every-time`     | Confirm every non-trivial action.                                            |
| `ask-dangerous-only` | Automatically approve SAFE/WARNING actions and ask before DANGEROUS actions. |
| `trusted`            | Automatically approve everything except RESTRICTED actions.                  |
| `read-only`          | Disable file writes and command execution.                                   |

The default permission mode is:

```text
ask-dangerous-only
```

`RESTRICTED` operations are always blocked.

The current permission mode is displayed in the CAI header:

```text
C:\Projects\MyProject   ·   ask-dangerous-only
```

## Project Rules

CAI supports project-specific instructions.

Initialize project rules with:

```bash
cai init
```

This creates:

```text
.cai/
└── rules.md
```

You can put project instructions inside `rules.md`.

Example:

```text
- Use TypeScript instead of JavaScript.
- Keep code readable and compact.
- Do not create unnecessary files.
- Follow the existing project structure.
- Do not modify the database schema.
```

CAI can use these rules while working inside the project.

## Project Memory

CAI can maintain lightweight project memory:

```text
.cai/
└── memory.json
```

Project memory is intended for durable project information that can help CAI understand the project across sessions.

Do not store secrets inside project memory.

Never store:

* API keys
* passwords
* access tokens
* private keys
* credentials

## Agent Workflow

CAI is designed to work as an AI agent rather than only a chatbot.

A typical task follows this process:

```text
User
  ↓
CAI CLI
  ↓
Gemini
  ↓
Tool request
  ↓
CAI tool execution
  ↓
Tool result
  ↓
Gemini
  ↓
Continue task
```

For example, if you ask:

```text
❯ Create a website and run it on port 3000.
```

CAI may inspect the project, create or modify files, install dependencies, execute commands, and continue working based on the results.

Tool activity is displayed while CAI works:

```text
→ inspect_project
✓ inspect_project

→ write_file
✓ write_file

→ run_command
✓ run_command
```

## CLI Commands

Commands available from the terminal include:

```bash
cai doctor
cai config
cai init
cai processes
```

### Doctor

Check the CAI environment and configuration:

```bash
cai doctor
```

### Config

View or change CAI configuration:

```bash
cai config
```

Example:

```bash
cai config set geminiModel gemini-3.6-flash
```

### Init

Create project-specific CAI rules:

```bash
cai init
```

### Processes

List background processes managed by CAI:

```bash
cai processes
```

### Interactive Commands

Inside a CAI session:

```text
/help
/session
/sessionRecovery
exit
quit
```

## Exiting CAI

To leave CAI, type:

```text
exit
```

or:

```text
quit
```

You can also use:

```text
Ctrl+C
```

to cancel the current action.

## Development

If you want to develop CAI itself, clone the repository:

```bash
git clone https://github.com/Reyofficial77/CAI.git
cd CAI
```

Install dependencies:

```bash
npm install
```

Build the TypeScript project:

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

## Local Global CLI Testing

When developing CAI, build the project first:

```bash
npm run build
```

Then install the local project globally:

```bash
npm install -g .
```

You can then test CAI from another directory:

```powershell
cd C:\Projects\TestProject
cai
```

## Project Structure

```text
CAI/
├── apps/
│   └── cli/
│       └── src/
│           ├── agent/        # Agent loop and session handling
│           ├── gemini/       # Gemini client
│           ├── tools/        # Filesystem, terminal, Git, and process tools
│           ├── config/       # Configuration
│           ├── ui/           # Terminal UI
│           └── types/        # Type definitions
├── python/                   # Python-side utilities
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Publishing

CAI is distributed through npm.

Create a package locally:

```bash
npm pack
```

Update the package version:

```bash
npm version patch
```

Publish the package:

```bash
npm publish --access public
```

## Security

CAI can execute commands on your computer.

Always review permission settings and understand what an action will do, especially when a command can:

* Modify files
* Delete files
* Install software
* Change system configuration
* Execute external programs
* Modify project data

Never publish or commit:

* `GEMINI_API_KEY`
* Passwords
* Access tokens
* Private keys
* `.env` files containing secrets
* Other credentials

## Roadmap

Planned improvements include:

* Better agent planning
* Faster agent execution
* Streaming Gemini responses
* Improved file editing
* Interactive file diffs
* More granular tool permissions
* Better error recovery
* Additional Gemini model support
* More development tools
* More game-development tools
* Better terminal UI
* Cross-platform improvements
* Automatic CAI updates
* Better multi-agent workflows

## License

See the repository license for the current project terms.

---

**CAI — Your AI assistant in the terminal.**
