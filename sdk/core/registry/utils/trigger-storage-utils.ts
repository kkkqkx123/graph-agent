/**
 * Trigger template storage utilities - Module-level functions for trigger template persistence.
 * Delegates to generic-storage-utils with TriggerTemplate-specific metadata builders.
 */

import type { TriggerTemplate } from "@wf-agent/types";
import type { TriggerStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const triggerInfo: StorageEntityInfo<TriggerTemplate> = {
  getId: (template) => template.name,
  buildMetadata: (template) => ({
    name: template.name,
    description: template.description || "",
    enabled: template.enabled ?? true,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    tags: (template.metadata?.["tags"] as string[]) || [],
    category: (template.metadata?.["category"] as string) || "",
  }),
  entityName: "trigger template",
};

/** Persist trigger template to storage (write-through) */
export async function persistTrigger(
  template: TriggerTemplate,
  adapter?: TriggerStorageAdapter | null,
): Promise<void> {
  return persistItem(template, adapter, triggerInfo);
}

/** Remove trigger template from storage */
export async function removeTrigger(
  name: string,
  adapter?: TriggerStorageAdapter | null,
): Promise<void> {
  return removeItem(name, adapter, "trigger template");
}

/** Load trigger template from storage */
export async function loadTrigger(
  name: string,
  adapter?: TriggerStorageAdapter | null,
): Promise<TriggerTemplate | null> {
  return loadItem<TriggerTemplate>(name, adapter, "trigger template");
}

/** Initialize trigger templates collection from storage */
export async function initializeTriggersFromStorage(
  adapter: TriggerStorageAdapter | null,
  templates: {
    set: (key: string, value: TriggerTemplate) => void;
    has: (key: string) => boolean;
    size: number;
  },
): Promise<void> {
  return initializeFromStorage(adapter, templates, triggerInfo);
}
