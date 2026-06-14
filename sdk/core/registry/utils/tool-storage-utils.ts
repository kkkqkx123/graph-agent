/**
 * Tool storage utilities - Module-level functions for tool persistence.
 * Delegates to generic-storage-utils with Tool-specific metadata builders.
 */

import type { Tool } from "@wf-agent/types";
import type { ToolStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const toolInfo: StorageEntityInfo<Tool> = {
  getId: (tool) => tool.id,
  buildMetadata: (tool) => ({
    toolId: tool.id,
    type: tool.type,
    description: tool.description || "",
    tags: tool.metadata?.tags || [],
    category: tool.metadata?.category || "",
  }),
  entityName: "tool",
};

/** Persist tool to storage (write-through) */
export async function persistTool(tool: Tool, adapter?: ToolStorageAdapter | null): Promise<void> {
  return persistItem(tool, adapter, toolInfo);
}

/** Remove tool from storage */
export async function removeTool(
  toolId: string,
  adapter?: ToolStorageAdapter | null,
): Promise<void> {
  return removeItem(toolId, adapter, "tool");
}

/** Load tool from storage */
export async function loadTool(
  toolId: string,
  adapter?: ToolStorageAdapter | null,
): Promise<Tool | null> {
  return loadItem<Tool>(toolId, adapter, "tool");
}

/** Initialize tools collection from storage */
export async function initializeToolsFromStorage(
  adapter: ToolStorageAdapter | null,
  tools: { set: (key: string, value: Tool) => void; has: (key: string) => boolean; size: number },
): Promise<void> {
  return initializeFromStorage(adapter, tools, toolInfo);
}
