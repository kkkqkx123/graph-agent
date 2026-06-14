/**
 * Script Registry
 * Manages script and flow blueprint registration, retrieval, and persistence.
 *
 * Responsibilities:
 * - Script CRUD (register, unregister, update, get, list, search)
 * - Flow blueprint management (register, get, list)
 * - Script validation
 * - Storage persistence (write-through)
 *
 * This module only exports class definitions; instances are managed by the DI container as singletons.
 */

import type {
  Script,
  ScriptExecutionOptions,
  ScriptExecutionResult,
  ScriptFlow,
} from "@wf-agent/types";
import {
  ScriptNotFoundError,
  ConfigurationValidationError,
  ScriptExecutionError,
} from "@wf-agent/types";
import { createContextualLogger } from "../../utils/contextual-logger.js";
import type { ScriptStorageAdapter } from "@wf-agent/storage";
import {
  persistScript,
  removeScript,
  initializeScriptsFromStorage,
} from "./utils/script-storage-utils.js";

const logger = createContextualLogger({ component: "ScriptRegistry" });

/**
 * Script Registry Class
 * Pure registry for script definitions and flow blueprints.
 * Execution logic is delegated to ScriptExecutor.
 */
class ScriptRegistry {
  private scripts: Map<string, Script> = new Map();
  private flows: Map<string, ScriptFlow> = new Map();

  constructor(private readonly storageAdapter: ScriptStorageAdapter | null = null) {}

  // ============================================================
  // Script CRUD
  // ============================================================

  /**
   * Register script (memory-only, no persistence).
   * Used for predefined content registration during bootstrap.
   * @param script Script definition
   * @throws ValidationError If the script definition is invalid or the name already exists
   */
  register(script: Script): void {
    this.validateScript(script);

    const scriptWithDefaults: Script = {
      ...script,
      enabled: script.enabled !== undefined ? script.enabled : true,
    };

    if (this.scripts.has(script.name)) {
      logger.warn("Script already exists", { scriptName: script.name });
      throw new ConfigurationValidationError(`Script with name '${script.name}' already exists`, {
        configType: "script",
        field: "name",
      });
    }

    this.scripts.set(script.name, scriptWithDefaults);
    logger.info("Script registered (memory-only)", { scriptName: script.name });
  }

  /**
   * Register Script with storage persistence (write-through).
   * @param script Script definition
   * @throws ValidationError If the script definition is invalid or the name already exists
   */
  async registerScript(script: Script): Promise<void> {
    this.validateScript(script);

    const scriptWithDefaults: Script = {
      ...script,
      enabled: script.enabled !== undefined ? script.enabled : true,
    };

    if (this.scripts.has(script.name)) {
      logger.warn("Script already exists", { scriptName: script.name });
      throw new ConfigurationValidationError(`Script with name '${script.name}' already exists`, {
        configType: "script",
        field: "name",
      });
    }

    // Persist to storage first (write-through: DB is source of truth)
    if (this.storageAdapter) {
      await persistScript(scriptWithDefaults, this.storageAdapter);
    }

    this.scripts.set(script.name, scriptWithDefaults);
    logger.info("Script registered", { scriptName: script.name });
  }

  /**
   * Batch registration script
   * @param scripts: An array of script definitions
   */
  async registerScripts(scripts: Script[]): Promise<void> {
    for (const script of scripts) {
      await this.registerScript(script);
    }
  }

  /**
   * Script Deletion
   * @param scriptName The name of the script
   * @throws NotFoundError If the script does not exist
   */
  async unregisterScript(scriptName: string): Promise<void> {
    if (!this.scripts.has(scriptName)) {
      logger.warn("Attempted to unregister non-existent script", { scriptName });
      throw new ScriptNotFoundError(`Script '${scriptName}' not found`, scriptName);
    }

    // Remove from storage first (write-through: DB is source of truth)
    if (this.storageAdapter) {
      await removeScript(scriptName, this.storageAdapter);
    }

    this.scripts.delete(scriptName);
    logger.info("Script unregistered", { scriptName });
  }

  /**
   * Get script definition
   * @param scriptName Script name
   * @returns Script definition
   * @throws NotFoundError If the script does not exist
   */
  getScript(scriptName: string): Script {
    const script = this.scripts.get(scriptName);
    if (!script) {
      throw new ScriptNotFoundError(`Script '${scriptName}' not found`, scriptName);
    }
    return script;
  }

  /**
   * Get the script definition (may return undefined)
   * @param scriptName The name of the script
   * @returns The script definition; returns undefined if it does not exist
   */
  findScript(scriptName: string): Script | undefined {
    return this.scripts.get(scriptName);
  }

  /**
   * List all scripts
   * @returns Array of script definitions
   */
  listScripts(): Script[] {
    return Array.from(this.scripts.values());
  }

  /**
   * List scripts by category
   * @param category Script category
   * @returns Array of script definitions
   */
  listScriptsByCategory(category: string): Script[] {
    return this.listScripts().filter(script => script.metadata?.category === category);
  }

  /**
   * Search Script
   * @param query Search keyword
   * @returns Array of matching scripts
   */
  searchScripts(query: string): Script[] {
    const lowerQuery = query.toLowerCase();
    return this.listScripts().filter(script => {
      return (
        script.name.toLowerCase().includes(lowerQuery) ||
        script.description.toLowerCase().includes(lowerQuery) ||
        script.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        script.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Check if the script exists
   * @param scriptName The name of the script
   * @returns Whether it exists or not
   */
  hasScript(scriptName: string): boolean {
    return this.scripts.has(scriptName);
  }

  /**
   * Clear all scripts
   */
  clearScripts(): void {
    const count = this.scripts.size;
    this.scripts.clear();
    logger.info("All scripts cleared", { count });
  }

  /**
   * Get the number of scripts
   * @returns The number of scripts
   */
  scriptCount(): number {
    return this.scripts.size;
  }

  /**
   * Update script definition
   * @param scriptName Script name
   * @param updates Update content
   * @throws NotFoundError If the script does not exist
   */
  async updateScript(scriptName: string, updates: Partial<Script>): Promise<void> {
    const script = this.getScript(scriptName);

    const updatedScript = {
      ...script,
      ...updates,
      enabled: updates.enabled !== undefined ? updates.enabled : (script.enabled ?? true),
    };

    this.validateScript(updatedScript);

    // Persist to storage first (write-through: DB is source of truth)
    if (this.storageAdapter) {
      await persistScript(updatedScript, this.storageAdapter);
    }

    this.scripts.set(scriptName, updatedScript);
  }

  /**
   * Enable the script
   * @param scriptName The name of the script
   * @throws NotFoundError If the script does not exist
   */
  async enableScript(scriptName: string): Promise<void> {
    await this.updateScript(scriptName, { enabled: true });
  }

  /**
   * Disable the script
   * @param scriptName The name of the script
   * @throws NotFoundError If the script does not exist
   */
  async disableScript(scriptName: string): Promise<void> {
    await this.updateScript(scriptName, { enabled: false });
  }

  /**
   * Check if the script is enabled.
   * @param scriptName: The name of the script
   * @returns: Whether it is enabled or not
   * @throws: NotFoundError: If the script does not exist
   */
  isScriptEnabled(scriptName: string): boolean {
    const script = this.getScript(scriptName);
    return script.enabled ?? true;
  }

  /**
   * Verify script definition
   * @param script The script definition
   * @returns Whether it is valid
   * @throws ValidationError If the script definition is invalid
   */
  validateScript(script: Script): boolean {
    if (!script.name || typeof script.name !== "string") {
      throw new ConfigurationValidationError("Script name is required and must be a string", {
        configType: "script",
        field: "name",
      });
    }

    if (!script.description || typeof script.description !== "string") {
      throw new ConfigurationValidationError(
        "Script description is required and must be a string",
        {
          configType: "script",
          field: "description",
        },
      );
    }

    if (!script.content && !script.filePath && !script.template) {
      throw new ConfigurationValidationError(
        "Script must have either content, filePath, or template",
        {
          configType: "script",
          field: "content",
        },
      );
    }

    if (!script.options) {
      throw new ConfigurationValidationError("Script options are required", {
        configType: "script",
        field: "options",
      });
    }

    if (script.options.timeout !== undefined && script.options.timeout < 0) {
      throw new ConfigurationValidationError("Script timeout must be a positive number", {
        configType: "script",
        field: "options.timeout",
      });
    }

    if (script.options.retries !== undefined && script.options.retries < 0) {
      throw new ConfigurationValidationError("Script retries must be a non-negative number", {
        configType: "script",
        field: "options.retries",
      });
    }

    if (script.options.retryDelay !== undefined && script.options.retryDelay < 0) {
      throw new ConfigurationValidationError("Script retryDelay must be a non-negative number", {
        configType: "script",
        field: "options.retryDelay",
      });
    }

    if (script.enabled !== undefined && typeof script.enabled !== "boolean") {
      throw new ConfigurationValidationError("Script enabled must be a boolean", {
        configType: "script",
        field: "enabled",
      });
    }

    return true;
  }

  // ============================================================
  // Flow Blueprint Management
  // ============================================================

  /**
   * Register a flow blueprint
   * @param flow Flow blueprint definition
   * @throws ConfigurationValidationError If the flow name already exists
   */
  registerFlow(flow: ScriptFlow): void {
    if (this.flows.has(flow.name)) {
      logger.warn("Flow already exists", { flowName: flow.name });
      throw new ConfigurationValidationError(`Flow with name '${flow.name}' already exists`, {
        field: "name",
      });
    }
    this.flows.set(flow.name, flow);
    logger.info("Flow registered", { flowName: flow.name });
  }

  /**
   * Get a flow blueprint
   * @param flowName Flow name
   * @returns Flow blueprint
   */
  getFlow(flowName: string): ScriptFlow {
    const flow = this.flows.get(flowName);
    if (!flow) {
      throw new Error(`Flow '${flowName}' not found`);
    }
    return flow;
  }

  /**
   * List all registered flows
   * @returns Array of flow blueprints
   */
  listFlows(): ScriptFlow[] {
    return Array.from(this.flows.values());
  }

  // ============================================================
  // Storage Initialization
  // ============================================================

  /**
   * Initialize scripts from storage
   * Loads all persisted script definitions into memory cache.
   */
  async initializeFromStorage(): Promise<void> {
    if (!this.storageAdapter) {
      return;
    }

    await initializeScriptsFromStorage(this.storageAdapter, this.scripts);
  }
}

/**
 * Script Execution Service
 * Handles script and flow execution, independent of registry concerns.
 *
 * Responsibilities:
 * - Script execution (simple, engine-based, batch)
 * - Flow blueprint execution
 */
class ScriptExecutionService {
  private scriptEngine: ScriptEngine | null = null;
  private flowEngine: ScriptFlowEngine | null = null;

  constructor(
    private readonly executor: ScriptExecutor_ = new ScriptExecutor_(),
  ) {}

  /**
   * Execute the script
   * @param scriptName The name of the script
   * @param options Execution options that override the script's default settings
   * @param registry ScriptRegistry instance to look up script definitions
   */
  async execute(
    scriptName: string,
    options: Partial<ScriptExecutionOptions> = {},
    registry: ScriptRegistry,
  ): Promise<Result<ScriptExecutionResult, ScriptExecutionError>> {
    logger.debug("Script execution started", { scriptName });

    const script = registry.getScript(scriptName);
    const result = await this.executor.execute(script, options);

    if (!result.success) {
      return err(
        new ScriptExecutionError(result.error || "Script execution failed", scriptName, {
          options,
        }),
      );
    }

    logger.debug("Script execution completed", { scriptName, success: result.success });
    return ok(result);
  }

  /**
   * Execute the script with ScriptEngine (supports template + executor mode)
   * @param scriptName The name of the script
   * @param options Execution options
   * @param args Runtime argument values for template rendering
   * @param registry ScriptRegistry instance to look up script definitions
   */
  async executeWithEngine(
    scriptName: string,
    options: Partial<ScriptExecutionOptions> = {},
    args: Record<string, unknown> = {},
    registry: ScriptRegistry,
  ): Promise<Result<ScriptExecutionResult, ScriptExecutionError>> {
    const script = registry.getScript(scriptName);

    if (!this.scriptEngine) {
      this.scriptEngine = new ScriptEngine();
    }

    const result = await this.scriptEngine.execute(script, options, { args });

    if (!result.success) {
      return err(
        new ScriptExecutionError(result.error || "Script execution failed", scriptName, {
          options,
          args,
        }),
      );
    }

    return ok(result);
  }

  /**
   * Execute a flow blueprint
   * @param flowName Flow name
   * @param registry ScriptRegistry instance to look up flow and script definitions
   */
  async executeFlow(
    flowName: string,
    registry: ScriptRegistry,
  ): Promise<import("../script/engine/script-flow-engine.js").FlowExecutionResult> {
    const flow = registry.getFlow(flowName);

    if (!this.scriptEngine) {
      this.scriptEngine = new ScriptEngine();
    }
    if (!this.flowEngine) {
      this.flowEngine = new ScriptFlowEngine(this.scriptEngine, registry["scripts"]);
    }

    return this.flowEngine.execute(flow);
  }

  /**
   * Batch execute scripts
   * @param executions Execution task array
   * @param registry ScriptRegistry instance to look up script definitions
   */
  async executeBatch(
    executions: Array<{
      scriptName: string;
      options?: Partial<ScriptExecutionOptions>;
    }>,
    registry: ScriptRegistry,
  ): Promise<Result<ScriptExecutionResult[], ScriptExecutionError>> {
    const results = await Promise.all(
      executions.map(exec => this.execute(exec.scriptName, exec.options, registry)),
    );

    return all(results);
  }
}

// Re-export types for convenience
import type { Result } from "@wf-agent/types";
import { ok, err, all } from "@wf-agent/common-utils";
import { ScriptExecutor as ScriptExecutor_ } from "../executors/script-executor.js";
import { ScriptEngine } from "../script/engine/script-engine.js";
import { ScriptFlowEngine } from "../script/engine/script-flow-engine.js";

export { ScriptRegistry, ScriptExecutionService };
