/**
 * Node template storage utilities - Module-level functions for node template persistence.
 * Delegates to generic-storage-utils with NodeTemplate-specific metadata builders.
 */

import type { NodeTemplate } from "@wf-agent/types";
import type { NodeTemplateStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

const nodeTemplateInfo: StorageEntityInfo<NodeTemplate> = {
  getId: (template) => template.name,
  buildMetadata: (template) => ({
    name: template.name,
    type: template.type,
    description: template.description || "",
    tags: (template.metadata?.["tags"] as string[]) || [],
    category: (template.metadata?.["category"] as string) || "",
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }),
  entityName: "node template",
};

/** Persist node template to storage (write-through) */
export async function persistNodeTemplate(
  template: NodeTemplate,
  adapter?: NodeTemplateStorageAdapter | null,
): Promise<void> {
  return persistItem(template, adapter, nodeTemplateInfo);
}

/** Remove node template from storage */
export async function removeNodeTemplate(
  name: string,
  adapter?: NodeTemplateStorageAdapter | null,
): Promise<void> {
  return removeItem(name, adapter, "node template");
}

/** Load node template from storage */
export async function loadNodeTemplate(
  name: string,
  adapter?: NodeTemplateStorageAdapter | null,
): Promise<NodeTemplate | null> {
  return loadItem<NodeTemplate>(name, adapter, "node template");
}

/** Initialize node templates collection from storage */
export async function initializeNodeTemplatesFromStorage(
  adapter: NodeTemplateStorageAdapter | null,
  templates: {
    set: (key: string, value: NodeTemplate) => void;
    has: (key: string) => boolean;
    size: number;
  },
): Promise<void> {
  return initializeFromStorage(adapter, templates, nodeTemplateInfo);
}
