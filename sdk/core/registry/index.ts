// Registry exports
export { ToolRegistry } from "./tool-registry.js";
export { ScriptRegistry, ScriptExecutionService } from "./script-registry.js";
export { AgentProfileRegistry } from "./agent-profile-registry.js";
export type { AgentProfileMeta } from "./agent-profile-registry.js";
export { SkillRegistry } from "./skill-registry.js";
export { TriggerTemplateRegistry } from "./trigger-template-registry.js";
export { NodeTemplateRegistry } from "./node-template-registry.js";
export { EventRegistry, ExecutionEventEmitter, type EventEmitterOptions } from "./event-registry.js";
export {
  ExecutionHierarchyRegistry,
  type AnyExecutionEntity,
  type ExecutionsByRoot,
} from "./execution-hierarchy-registry.js";

// Timeout Management
export { TimeoutRegistry } from "./timeout-registry.js";

// Prompt Template & Fragment Registries
export { PromptTemplateRegistry } from "./prompt-template-registry.js";
export { FragmentRegistry } from "./fragment-registry.js";
export type { UnregisterResult } from "./fragment-registry.js";

// Registry Interfaces
export type {
  Registry,
  MutableRegistry,
  PersistableRegistry,
  BatchOperations,
  SearchableRegistry,
  ExportableRegistry,
  RegistryOptions,
  RegistryOperationResult,
} from "./types.js";

// Registry Error Classes
export {
  RegistryError,
  RegistryNotFoundError,
  RegistryAlreadyExistsError,
  RegistryValidationError,
} from "./types.js";

// Registry Utilities
export { createRegistry } from "./utils/registry-utils.js";
export { HierarchyTraversalService } from "./utils/hierarchy-traversal-service.js";

// Consolidated Entity Storage Utilities
export {
  persistAgentProfile,
  removeAgentProfile,
  loadAgentProfile,
  initializeAgentProfilesFromStorage,
  persistHookTemplate,
  removeHookTemplate,
  loadHookTemplate,
  initializeHookTemplatesFromStorage,
  persistNodeTemplate,
  removeNodeTemplate,
  loadNodeTemplate,
  initializeNodeTemplatesFromStorage,
  persistScript,
  removeScript,
  loadScript,
  initializeScriptsFromStorage,
  persistTool,
  removeTool,
  loadTool,
  initializeToolsFromStorage,
  persistTrigger,
  removeTrigger,
  loadTrigger,
  initializeTriggersFromStorage,
} from "./utils/entity-storage-utils.js";

// Validation Utilities
export {
  validateRequiredFields,
  validateRequiredString,
  validateIdentifier,
  validateBoolean,
  validatePositiveNumber,
  validateEnum,
  validateAtLeastOne,
  validateMetadata,
  combineValidationResults,
  isRegistryValidationError,
  type RequiredFieldRule,
  type ValidationResult,
} from "./utils/validation-utils.js";

