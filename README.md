# CAI

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

```bash
cai
```

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

The default mode is:

```text
ask-dangerous-only
```

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

```text
CAI/
├── apps/
│   └── cli/
│       └── src/
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

## Roadmap

Planned improvements include:

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
