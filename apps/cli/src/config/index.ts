import Conf from "conf";
import type { CAIConfig, PermissionMode } from "../types/index.js";

const DEFAULT_MODEL = "gemini-3.8-flash";

const store = new Conf<CAIConfig>({
  projectName: "cai",
  defaults: {
    geminiModel: DEFAULT_MODEL,
    permissionMode: "ask-dangerous-only",
    theme: "default",
    commandTimeoutMs: 120_000,
    loggingEnabled: false,
  },
});

/**
 * Resolves the active configuration.
 * Precedence: environment variables > persisted config file > defaults.
 * The Gemini API key is NEVER hard-coded and NEVER persisted unless the
 * user explicitly runs `cai config set geminiApiKey`.
 */
export function getConfig(): CAIConfig {
  const persisted = store.store;

  const geminiApiKey = process.env.GEMINI_API_KEY ?? persisted.geminiApiKey;
  const geminiModel = process.env.GEMINI_MODEL ?? persisted.geminiModel ?? DEFAULT_MODEL;
  const permissionMode =
    (process.env.CAI_PERMISSION_MODE as PermissionMode | undefined) ??
    persisted.permissionMode;

  return {
    ...persisted,
    geminiApiKey,
    geminiModel,
    permissionMode,
  };
}

export function setConfigValue<K extends keyof CAIConfig>(key: K, value: CAIConfig[K]): void {
  store.set(key, value);
}

export function getConfigPath(): string {
  return store.path;
}

export { DEFAULT_MODEL };
