/**
 * Hook template storage utilities - Module-level functions for hook template persistence.
 * Delegates to generic-storage-utils with HookTemplate-specific metadata builders.
 */

import type { HookTemplate } from "@wf-agent/types";
import type { HookTemplateStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const hookTemplateInfo: StorageEntityInfo<HookTemplate> = {
  getId: (template) => template.name,
  buildMetadata: (template) => ({
    name: template.name,
    hookType: template.hook.hookType,
    description: template.description || "",
    tags: (template.metadata?.["tags"] as string[]) || [],
    category: (template.metadata?.["category"] as string) || "",
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }),
  entityName: "hook template",
};

/** Persist hook template to storage (write-through) */
export async function persistHookTemplate(
  template: HookTemplate,
  adapter?: HookTemplateStorageAdapter | null,
): Promise<void> {
  return persistItem(template, adapter, hookTemplateInfo);
}

/** Remove hook template from storage */
export async function removeHookTemplate(
  name: string,
  adapter?: HookTemplateStorageAdapter | null,
): Promise<void> {
  return removeItem(name, adapter, "hook template");
}

/** Load hook template from storage */
export async function loadHookTemplate(
  name: string,
  adapter?: HookTemplateStorageAdapter | null,
): Promise<HookTemplate | null> {
  return loadItem<HookTemplate>(name, adapter, "hook template");
}

/** Initialize hook templates collection from storage */
export async function initializeHookTemplatesFromStorage(
  adapter: HookTemplateStorageAdapter | null,
  templates: {
    set: (key: string, value: HookTemplate) => void;
    has: (key: string) => boolean;
    size: number;
  },
): Promise<void> {
  return initializeFromStorage(adapter, templates, hookTemplateInfo);
}
