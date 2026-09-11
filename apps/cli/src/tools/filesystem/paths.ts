import path from "node:path";

export class PathSecurityError extends Error {}

/**
 * Resolves `relativeOrAbsolute` against `projectRoot` and guarantees the
 * result stays inside the project root. Throws PathSecurityError otherwise.
 * Handles both POSIX and Windows-style traversal attempts.
 */
export function resolveSafePath(projectRoot: string, target: string): string {
  const normalizedRoot = path.resolve(projectRoot);
  const resolved = path.isAbsolute(target)
    ? path.resolve(target)
    : path.resolve(normalizedRoot, target);

  const relative = path.relative(normalizedRoot, resolved);

  const escapesRoot =
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);

  if (escapesRoot) {
    throw new PathSecurityError(
      `Access denied: "${target}" resolves outside the project root (${normalizedRoot}).`
    );
  }

  return resolved;
}

export function isWithinRoot(projectRoot: string, target: string): boolean {
  try {
    resolveSafePath(projectRoot, target);
    return true;
  } catch {
    return false;
  }
}
