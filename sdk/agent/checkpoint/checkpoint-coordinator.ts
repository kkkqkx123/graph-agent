/**
 * Agent Loop Checkpoint Coordinator
 *
 * A service that coordinates the entire checkpoint process
 * Extends BaseCheckpointCoordinator to eliminate code duplication.
 */

import { AgentLoopEntity } from "../entities/agent-loop-entity.js";
import type {
  CheckpointMetadata,
  DeltaStorageConfig,
  TCheckpointType,
  AgentLoopCheckpoint,
  AgentLoopStateSnapshot,
  AgentLoopRuntimeConfig,
  DeltaCheckpoint,
  FullCheckpoint,
  AgentLoopDelta,
  AgentCheckpointContentConfig,
} from "@wf-agent/types";
import { AgentCheckpointError, CURRENT_CHECKPOINT_FORMAT_VERSION } from "@wf-agent/types";
import { BaseCheckpointCoordinator } from "../../core/checkpoint/base-checkpoint-coordinator.js";
import type { CheckpointDependencies as BaseCheckpointDependencies } from "../../core/checkpoint/types.js";
import { CheckpointVersionManager } from "../../core/checkpoint/checkpoint-version-manager.js";
import { createContextualLogger } from "../../utils/contextual-logger.js";

const logger = createContextualLogger({ component: "AgentLoopCheckpointCoordinator" });

/**
 * Checkpoint creation options
 */
export interface CheckpointOptions {
  /** Checkpoint metadata */
  metadata?: CheckpointMetadata;
  /** Optional description */
  description?: string;
  /** Optional tags */
  tags?: string[];
  /** Content configuration for what to include in checkpoint */
  contentConfig?: AgentCheckpointContentConfig;
}

/**
 * Checkpoint dependencies (extends base with agent-specific fields)
 */
export interface CheckpointDependencies extends BaseCheckpointDependencies<AgentLoopCheckpoint> {
  /** Save checkpoints */
  saveCheckpoint: (checkpoint: AgentLoopCheckpoint) => Promise<string>;
  /** Get checkpoints */
  getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>;
  /** List the checkpoints */
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
  /** Incremental storage configuration (optional) */
  deltaConfig?: DeltaStorageConfig;
}

/**
 * Agent Loop checkpoint coordinator
 *
 * Design Principles:
 * - Instance-based for dependency injection and testability
 * - Coordinates the entire checkpoint lifecycle
 * - Extends BaseCheckpointCoordinator to eliminate duplication
 * - Config must be provided at construction time (via constructor) for restore operations
 *   because AgentLoopRuntimeConfig contains callbacks that cannot be serialized
 */
export class AgentLoopCheckpointCoordinator extends BaseCheckpointCoordinator<
  AgentLoopCheckpoint,
  AgentLoopEntity,
  AgentLoopStateSnapshot
> {
  /**
   * Config for restore operations.
   * Required because AgentLoopRuntimeConfig contains callbacks that cannot be serialized.
   * Must be set before calling restoreFromCheckpoint().
   */
  private restoreConfig?: AgentLoopRuntimeConfig;

  /**
   * Version manager for format compatibility and migration
   */
  private versionManager: CheckpointVersionManager;

  /**
   * @param config AgentLoopRuntimeConfig for restoration (must be provided for restore operations)
   */
  constructor(config?: AgentLoopRuntimeConfig) {
    super();
    this.restoreConfig = config;
    this.versionManager = new CheckpointVersionManager(logger);
  }

  /**
   * Set config for restore operations
   * @param config AgentLoopRuntimeConfig for restoration
   */
  setConfig(config: AgentLoopRuntimeConfig): void {
    this.restoreConfig = config;
  }
  /**
   * Create a checkpoint
   * @param entity Agent Loop entity
   * @param dependencies dependencies
   * @param options checkpoint options
   * @returns checkpoint ID
   */
  override async createCheckpoint(
    entity: AgentLoopEntity,
    dependencies: CheckpointDependencies,
    options?: CheckpointOptions,
  ): Promise<string> {
    const mergedMetadata: CheckpointMetadata | undefined = options
      ? {
          ...options.metadata,
          description: options.description ?? options.metadata?.description,
          tags: options.tags ?? options.metadata?.tags,
          customFields: {
            ...options.metadata?.customFields,
            formatVersion: CURRENT_CHECKPOINT_FORMAT_VERSION,
            createdAt: Date.now(),
          },
        }
      : undefined;

    // Store contentConfig for use in extractState
    this.currentContentConfig = options?.contentConfig;

    try {
      return await super.createCheckpoint(entity, dependencies, mergedMetadata);
    } finally {
      // Clear after checkpoint is created
      this.currentContentConfig = undefined;
    }
  }

  /**
   * Current content config being used during checkpoint creation
   * @private
   */
  private currentContentConfig?: AgentCheckpointContentConfig;

  /**
   * Restore Agent Loop entity from checkpoint
   * @param checkpointId checkpointId
   * @param dependencies dependencies
   * @returns Recovered Agent Loop Entity
   */
  override async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies,
  ): Promise<AgentLoopEntity> {
    try {
      // Retrieve checkpoint
      const checkpoint = await dependencies.getCheckpoint(checkpointId);
      if (!checkpoint) {
        throw new Error("Checkpoint not found");
      }

      // Validate version metadata
      const formatVersion = (checkpoint.metadata?.customFields?.["formatVersion"] as any) || CURRENT_CHECKPOINT_FORMAT_VERSION;
      if (!formatVersion) {
        logger.warn("Checkpoint missing version metadata, treating as v1.0", { checkpointId });
      }

      // Check compatibility and migrate if needed
      const compatibility = this.versionManager.checkCompatibility(formatVersion);
      if (!compatibility.compatible) {
        throw new Error(`Checkpoint version not compatible: ${compatibility.reason}`);
      }

      if (compatibility.requiresMigration) {
        logger.info("Checkpoint requires migration, starting migration process", {
          checkpointId,
          reason: compatibility.reason,
        });
        const migrationResult = await this.versionManager.migrateCheckpoint(checkpoint);
        if (!migrationResult.success) {
          throw new Error(`Checkpoint migration failed: ${migrationResult.errors?.join(", ")}`);
        }
      }

      return await super.restoreFromCheckpoint(checkpointId, dependencies);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Checkpoint not found")) {
        throw new AgentCheckpointError(
          `Checkpoint not found: ${checkpointId}`,
          "restore",
          checkpointId,
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // Abstract Methods Implementation
  // ============================================================================

  /**
   * Extracting a state snapshot
   *
   * Only serializes persistent execution progress data (iteration count, status, tool calls).
   * Does NOT include:
   * - `config`: Contains callbacks, must be re-provided by application on restore
   * - `messages`: Managed by ConversationSession, not AgentLoopState
   *
   * Respects content filtering options from AgentCheckpointContentConfig:
   * - includeState: Whether to include status, iteration count, etc. (default: true)
   * - includeMessages: Whether to include message history (default: false)
   * - messageLimit: Max number of messages to include
   * - includeToolCalls: Whether to include tool call records (default: true)
   * - toolCallLimit: Max number of tool calls to include
   *
   * @param entity Agent Loop entity
   * @returns Status Snapshot
   */
  protected extractState(entity: AgentLoopEntity): AgentLoopStateSnapshot {
    const contentConfig = this.currentContentConfig;
    const snapshot: any = {};

    // Include execution state by default
    if (contentConfig?.includeState !== false) {
      snapshot.status = entity.state.status;
      snapshot.currentIteration = entity.state.currentIteration;
      snapshot.toolCallCount = entity.state.toolCallCount;
      snapshot.startTime = entity.state.startTime;
      snapshot.endTime = entity.state.endTime;
      snapshot.error = entity.state.error;
    }

    // Include tool calls by default, unless explicitly disabled
    if (contentConfig?.includeToolCalls !== false) {
      // Note: Message and tool call inclusion would require extending AgentLoopEntity interface
      // For now, we include only the state fields
    }

    return snapshot;
  }

  /**
   * Build checkpoint object
   */
  protected async buildCheckpoint(
    entity: AgentLoopEntity,
    currentState: AgentLoopStateSnapshot,
    checkpointType: TCheckpointType,
    checkpointId: string,
    timestamp: number,
    previousCheckpointIds: string[],
    dependencies: CheckpointDependencies,
    metadata?: CheckpointMetadata,
  ): Promise<AgentLoopCheckpoint> {
    const { getCheckpoint } = dependencies;

    if (checkpointType === "FULL") {
      return {
        id: checkpointId,
        agentLoopId: entity.id,
        timestamp,
        type: "FULL",
        snapshot: currentState,
        metadata,
      };
    }

    // Creating incremental checkpoints
    return this.buildDeltaCheckpoint(
      entity,
      currentState,
      checkpointId,
      timestamp,
      previousCheckpointIds,
      getCheckpoint,
      metadata,
    );
  }

  /**
   * Extract parent ID from checkpoint
   */
  protected extractParentId(checkpoint: AgentLoopCheckpoint): string {
    return checkpoint.agentLoopId;
  }

  /**
   * Create entity from restored state snapshot
   *
   * Uses the stored `restoreConfig` to provide AgentLoopRuntimeConfig.
   * Config must be set before calling restoreFromCheckpoint() via constructor or setConfig().
   *
   * @param parentId Parent entity ID (used as entity id)
   * @param snapshot Restored state snapshot
   * @returns Reconstructed AgentLoopEntity with config injected
   * @throws Error if restoreConfig is not set
   */
  protected createEntityFromSnapshot(
    parentId: string,
    snapshot: AgentLoopStateSnapshot,
  ): AgentLoopEntity {
    if (!this.restoreConfig) {
      throw new Error(
        "AgentLoopRuntimeConfig is required for restore. " +
          "Set it via constructor: new AgentLoopCheckpointCoordinator(config) " +
          "or via setConfig(config) before calling restoreFromCheckpoint().",
      );
    }
    return AgentLoopEntity.fromSnapshot(parentId, snapshot, this.restoreConfig);
  }

  /**
   * Build delta checkpoint
   */
  private async buildDeltaCheckpoint(
    entity: AgentLoopEntity,
    currentState: AgentLoopStateSnapshot,
    checkpointId: string,
    timestamp: number,
    previousCheckpointIds: string[],
    getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>,
    metadata?: CheckpointMetadata,
  ): Promise<AgentLoopCheckpoint> {
    const previousCheckpointId = previousCheckpointIds[0]!;
    const previousCheckpoint = await getCheckpoint(previousCheckpointId);

    if (!previousCheckpoint) {
      // If the previous checkpoint cannot be obtained, downgrade to the full checkpoint
      return {
        id: checkpointId,
        agentLoopId: entity.id,
        timestamp,
        type: "FULL" as const,
        snapshot: currentState,
        metadata,
      };
    }

    // Find baseline checkpoints (full checkpoints with snapshot)
    const baseCheckpoint = await this.findBaseCheckpoint(previousCheckpoint, getCheckpoint);

    // If a checkpoint containing a snapshot is still not found, downgrade to the full checkpoint
    if (!baseCheckpoint?.snapshot) {
      return {
        id: checkpointId,
        agentLoopId: entity.id,
        timestamp,
        type: "FULL" as const,
        snapshot: currentState,
        metadata,
      };
    }

    // Calculate the difference using inherited diffCalculator
    const delta = this.diffCalculator.calculateDelta(baseCheckpoint.snapshot, currentState);

    // Find the baseline checkpoint ID
    const baseCheckpointId =
      previousCheckpoint.type === "FULL"
        ? previousCheckpoint.id
        : previousCheckpoint.baseCheckpointId!;

    return {
      id: checkpointId,
      agentLoopId: entity.id,
      timestamp,
      type: "DELTA",
      baseCheckpointId,
      previousCheckpointId,
      delta,
      metadata,
    };
  }

  /**
   * Find base checkpoint for delta calculation
   */
  private async findBaseCheckpoint(
    previousCheckpoint: AgentLoopCheckpoint,
    getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>,
  ): Promise<AgentLoopCheckpoint | null> {
    if (previousCheckpoint.type === "FULL") {
      return previousCheckpoint;
    }

    // If the previous checkpoint is delta, the nearest complete checkpoint needs to be found
    if (previousCheckpoint.baseCheckpointId) {
      const base = await getCheckpoint(previousCheckpoint.baseCheckpointId);
      if (base && base.snapshot) {
        return base;
      }
    }

    return null;
  }

  /**
   * Verify checkpoint integrity and compatibility
   */
  protected override validateCheckpoint(checkpoint: AgentLoopCheckpoint): void {
    // Call parent validation first
    super.validateCheckpoint(checkpoint);

    // Additional agent-specific validation
    if (!checkpoint.agentLoopId) {
      throw new AgentCheckpointError(
        "Invalid checkpoint: missing agentLoopId",
        "validate",
        checkpoint.id,
        checkpoint.agentLoopId,
      );
    }

    // Validation against checkpoint type
    if (checkpoint.type === "DELTA") {
      const deltaCheckpoint = checkpoint as DeltaCheckpoint<AgentLoopDelta>;
      if (!deltaCheckpoint.delta && !deltaCheckpoint.previousCheckpointId) {
        throw new AgentCheckpointError(
          "Invalid delta checkpoint: missing delta data and previous checkpoint reference",
          "validate",
          checkpoint.id,
          checkpoint.agentLoopId,
        );
      }
    } else {
      const fullCheckpoint = checkpoint as FullCheckpoint<AgentLoopStateSnapshot>;
      if (!fullCheckpoint.snapshot) {
        throw new AgentCheckpointError(
          "Invalid full checkpoint: missing state snapshot",
          "validate",
          checkpoint.id,
          checkpoint.agentLoopId,
        );
      }

      // Verify the snapshot structure
      const { snapshot } = fullCheckpoint;
      if (!snapshot.status) {
        throw new AgentCheckpointError(
          "Invalid checkpoint: incomplete state snapshot",
          "validate",
          checkpoint.id,
          checkpoint.agentLoopId,
        );
      }
    }
  }

  /**
   * Get version manager for compatibility checks and migrations
   */
  getVersionManager(): CheckpointVersionManager {
    return this.versionManager;
  }

  /**
   * Check if checkpoint needs version migration
   */
  needsVersionMigration(checkpoint: AgentLoopCheckpoint): boolean {
    const formatVersion = (checkpoint.metadata?.customFields?.["formatVersion"] as any) || CURRENT_CHECKPOINT_FORMAT_VERSION;
    const compatibility = this.versionManager.checkCompatibility(formatVersion);
    return compatibility.requiresMigration;
  }
}
