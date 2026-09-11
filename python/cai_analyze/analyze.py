"""
CAI project analyzer.

Invoked by the TypeScript CLI (via subprocess) for deeper static analysis
than is worth implementing in Node: line/file counts by language, rough
complexity signals, and TODO/FIXME scanning. Prints JSON to stdout so the
TS side can parse it directly.

Usage:
    python3 python/cai_analyze/analyze.py <project_root>
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

SKIP_DIRS = {"node_modules", ".git", "dist", "__pycache__", ".venv", "build", ".cai"}

LANGUAGE_BY_EXT = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".lua": "Lua",
    ".html": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
}

TODO_PATTERN = re.compile(r"\b(TODO|FIXME|HACK)\b[:\s]?(.*)", re.IGNORECASE)


def analyze(project_root: str) -> dict:
    root = Path(project_root).resolve()
    if not root.exists():
        return {"error": f"Project root does not exist: {project_root}"}

    stats_by_language: dict[str, dict] = {}
    todos: list[dict] = []
    total_files = 0
    total_lines = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        for filename in filenames:
            ext = Path(filename).suffix.lower()
            language = LANGUAGE_BY_EXT.get(ext)
            if not language:
                continue

            full_path = Path(dirpath) / filename
            try:
                text = full_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue

            lines = text.splitlines()
            total_files += 1
            total_lines += len(lines)

            bucket = stats_by_language.setdefault(language, {"files": 0, "lines": 0})
            bucket["files"] += 1
            bucket["lines"] += len(lines)

            rel_path = str(full_path.relative_to(root))
            for i, line in enumerate(lines, start=1):
                match = TODO_PATTERN.search(line)
                if match:
                    todos.append(
                        {
                            "file": rel_path,
                            "line": i,
                            "tag": match.group(1).upper(),
                            "text": match.group(2).strip()[:200],
                        }
                    )

    return {
        "project_root": str(root),
        "total_files": total_files,
        "total_lines": total_lines,
        "by_language": stats_by_language,
        "todos": todos[:100],
        "todo_count": len(todos),
    }


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyze.py <project_root>"}))
        sys.exit(1)

    result = analyze(sys.argv[1])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
