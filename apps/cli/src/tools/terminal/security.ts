import type { PermissionLevel } from "../../types/index.js";

const RESTRICTED_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+\/(?:\s|$)/i,
  /\bformat\s+[a-z]:/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /:\(\)\{.*\};:/, // fork bomb
  />\s*\/dev\/sd[a-z]/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

const DANGEROUS_PATTERNS: RegExp[] = [
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b/i,
  /\bgit\s+push\s+.*--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[a-z]*f/i,
  /\bdel\s+\/s\b/i,
  /\bRemove-Item\b.*-Recurse/i,
  /\bdrop\s+(database|table)\b/i,
  /\btruncate\b/i,
  /\bchmod\s+-R\b/i,
  /\bnpm\s+publish\b/i,
  /\bsudo\b/i,
];

const WARNING_PATTERNS: RegExp[] = [
  /\bnpm\s+install\b/i,
  /\bpip\s+install\b/i,
  /\byarn\s+add\b/i,
  /\bgit\s+commit\b/i,
  /\bgit\s+checkout\b/i,
  /\bgit\s+merge\b/i,
];

export function classifyCommand(command: string): PermissionLevel {
  if (RESTRICTED_PATTERNS.some((re) => re.test(command))) return "RESTRICTED";
  if (DANGEROUS_PATTERNS.some((re) => re.test(command))) return "DANGEROUS";
  if (WARNING_PATTERNS.some((re) => re.test(command))) return "WARNING";
  return "SAFE";
}
