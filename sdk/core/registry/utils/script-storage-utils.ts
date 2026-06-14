/**
 * Script storage utilities - Module-level functions for script persistence.
 * Delegates to generic-storage-utils with Script-specific metadata builders.
 */

import type { Script } from "@wf-agent/types";
import type { ScriptStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const scriptInfo: StorageEntityInfo<Script> = {
  getId: (script) => script.name,
  buildMetadata: (script) => ({
    name: script.name,
    description: script.description || "",
    enabled: script.enabled ?? true,
    tags: script.metadata?.tags || [],
    category: script.metadata?.category || "",
    createdAt: 0,
    updatedAt: 0,
  }),
  entityName: "script",
};

/** Persist script to storage (write-through) */
export async function persistScript(
  script: Script,
  adapter?: ScriptStorageAdapter | null,
): Promise<void> {
  return persistItem(script, adapter, scriptInfo);
}

/** Remove script from storage */
export async function removeScript(
  scriptName: string,
  adapter?: ScriptStorageAdapter | null,
): Promise<void> {
  return removeItem(scriptName, adapter, "script");
}

/** Load script from storage */
export async function loadScript(
  scriptName: string,
  adapter?: ScriptStorageAdapter | null,
): Promise<Script | null> {
  return loadItem<Script>(scriptName, adapter, "script");
}

/** Initialize scripts collection from storage */
export async function initializeScriptsFromStorage(
  adapter: ScriptStorageAdapter | null,
  scripts: { set: (key: string, value: Script) => void; has: (key: string) => boolean; size: number },
): Promise<void> {
  return initializeFromStorage(adapter, scripts, scriptInfo);
}
