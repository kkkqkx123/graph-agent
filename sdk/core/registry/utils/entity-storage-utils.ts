/**
 * Entity Storage Utilities - Consolidated storage functions for all entity types.
 *
 * Replaces 6 individual storage utility files with a single consolidated module.
 * Each entity type provides its own StorageEntityInfo metadata.
 *
 * Dependencies (storage adapter) are passed as function parameters.
 */

import type { AgentProfileMeta } from "../agent-profile-registry.js";
import type { HookTemplate } from "@wf-agent/types";
import type { NodeTemplate } from "@wf-agent/types";
import type { Script } from "@wf-agent/types";
import type { Tool } from "@wf-agent/types";
import type { TriggerTemplate } from "@wf-agent/types";
import type { AgentProfileStorageAdapter } from "@wf-agent/storage";
import type { HookTemplateStorageAdapter } from "@wf-agent/storage";
import type { NodeTemplateStorageAdapter } from "@wf-agent/storage";
import type { ScriptStorageAdapter } from "@wf-agent/storage";
import type { ToolStorageAdapter } from "@wf-agent/storage";
import type { TriggerStorageAdapter } from "@wf-agent/storage";
import {
  persistItem,
  removeItem,
  loadItem,
  initializeFromStorage,
  type StorageEntityInfo,
} from "./generic-storage-utils.js";

// ==================== Agent Profile ====================

const agentProfileInfo: StorageEntityInfo<AgentProfileMeta> = {
  getId: (profile) => profile.id,
  buildMetadata: (profile) => ({
    profileId: profile.id,
    name: profile.name,
    description: profile.description || "",
  }),
  entityName: "agent profile",
};

/** Persist agent profile to storage (write-through) */
export async function persistAgentProfile(
  profile: AgentProfileMeta,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<void> {
  return persistItem(profile, adapter, agentProfileInfo);
}

/** Remove agent profile from storage */
export async function removeAgentProfile(
  profileId: string,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<void> {
  return removeItem(profileId, adapter, "agent profile");
}

/** Load agent profile from storage */
export async function loadAgentProfile(
  profileId: string,
  adapter?: AgentProfileStorageAdapter | null,
): Promise<AgentProfileMeta | null> {
  return loadItem<AgentProfileMeta>(profileId, adapter, "agent profile");
}

/** Initialize agent profiles collection from storage */
export async function initializeAgentProfilesFromStorage(
  adapter: AgentProfileStorageAdapter | null,
  profiles: {
    set: (key: string, value: AgentProfileMeta) => void;
    has: (key: string) => boolean;
    size: number;
  },
): Promise<void> {
  return initializeFromStorage(adapter, profiles, agentProfileInfo);
}

// ==================== Hook Template ====================

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

// ==================== Node Template ====================

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

// ==================== Script ====================

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

// ==================== Tool ====================

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

// ==================== Trigger Template ====================

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
