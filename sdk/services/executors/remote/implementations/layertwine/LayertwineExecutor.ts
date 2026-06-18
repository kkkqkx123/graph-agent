/**
 * Layertwine gRPC Executor
 *
 * Encapsulates all communication details with the Layertwine gRPC service
 * Supports embedded (SDK auto-starts binary) and remote (pre-deployed) modes
 */

import { BaseRemoteExecutor } from "../../BaseRemoteExecutor.js";
import type { RemoteConnectionConfig, RemoteExecutorStatus } from "../../types.js";
import { GrpcClient } from "../../../../transport/grpc/GrpcClient.js";
import { LayertwineProcessManager } from "./layertwine-process.js";
import type {
  LayertwineInitRequest,
  LayertwineInitResponse,
  LayertwineEditRequest,
  LayertwineEditResponse,
  LayertwineStatusResponse,
  LayertwineCommitRequest,
  LayertwineCommitResponse,
  LayertwineLogRequest,
  LayertwineLogResponse,
  LayertwineBranchListResponse,
  LayertwineAgentEditRequest,
  LayertwineAgentEditResponse,
  LayertwineAgentSubmitRequest,
  LayertwineAgentSubmitResponse,
  LayertwineApproveRequest,
  LayertwineApproveResponse,
  LayertwineBackupRequest,
  LayertwineBackupResponse,
  LayertwineRestoreRequest,
  LayertwineRestoreResponse,
  LayertwineSelectiveRestoreRequest,
  LayertwineSelectiveRestoreResponse,
  LayertwineRestoreByTimeRequest,
  LayertwineRestoreByTimeResponse,
  LayertwineDiffRequest,
  LayertwineDiffResponse,
  LayertwineGetSnapshotRequest,
  LayertwineGetSnapshotResponse,
} from "./types.js";

export type LayertwineDeployMode = "embedded" | "remote";

export interface LayertwineExecutorConfig {
  deployMode: LayertwineDeployMode;
  // Remote mode
  address?: string;
  // Embedded mode
  binaryPath?: string;
  dbPath?: string;
  protoPath?: string;
}

/**
 * Layertwine gRPC Executor
 */
export class LayertwineExecutor extends BaseRemoteExecutor {
  private grpcClient: GrpcClient | null = null;
  private config: LayertwineExecutorConfig;
  private mode: LayertwineDeployMode;
  private processManager: LayertwineProcessManager | null = null;

  constructor(config: LayertwineExecutorConfig) {
    super();
    this.config = config;
    this.mode = config.deployMode;
  }

  /**
   * Connect to Layertwine service
   */
  async connect(connectionConfig: RemoteConnectionConfig): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // For embedded mode: start the Layertwine process
      if (this.mode === "embedded") {
        if (!this.config.binaryPath || !this.config.dbPath) {
          throw new Error("binaryPath and dbPath are required for embedded mode");
        }

        this.processManager = new LayertwineProcessManager({
          binaryPath: this.config.binaryPath,
          dbPath: this.config.dbPath,
          grpcAddr: connectionConfig.address,
        });

        await new Promise<void>((resolve, reject) => {
          if (!this.processManager) {
            reject(new Error("Process manager not initialized"));
            return;
          }

          this.processManager.once("ready", resolve);
          this.processManager.once("error", reject);
          this.processManager.start();
        });
      }

      // Create gRPC client and connect
      if (!this.config.protoPath) {
        throw new Error("protoPath is required");
      }

      this.grpcClient = new GrpcClient({
        address: connectionConfig.address,
        serviceName: "layertwine.Layertwine",
        protoPath: this.config.protoPath,
        useTls: connectionConfig.useTls,
        defaultTimeout: connectionConfig.timeout,
        enableHealthCheck: true,
        healthCheckInterval: 5000,
      });

      await this.grpcClient.connect();
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Layertwine service
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.grpcClient?.close();
      await this.processManager?.stop();
    } finally {
      this.grpcClient = null;
      this.processManager = null;
      this.connected = false;
    }
  }

  /**
   * Generic RPC call
   */
  async call<TReq, TResp>(method: string, request: TReq): Promise<TResp> {
    if (!this.grpcClient?.isConnected()) {
      throw new Error("Layertwine executor not connected");
    }
    return this.grpcClient.call<TReq, TResp>(method, request);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.grpcClient?.isConnected() === true;
  }

  /**
   * Get executor status
   */
  getStatus(): RemoteExecutorStatus {
    if (!this.grpcClient) {
      return "disconnected";
    }
    if (!this.grpcClient.isConnected()) {
      return "disconnected";
    }
    return "connected";
  }

  /**
   * Get executor type
   */
  getExecutorType(): string {
    return "layertwine-grpc";
  }

  // ══════════════════════════════════════════════════════════════
  // Layertwine Convenience Methods
  // ══════════════════════════════════════════════════════════════

  /**
   * Initialize repository
   */
  async init(request: LayertwineInitRequest): Promise<LayertwineInitResponse> {
    return this.call<LayertwineInitRequest, LayertwineInitResponse>("Init", request);
  }

  /**
   * Edit a file
   */
  async edit(request: LayertwineEditRequest): Promise<LayertwineEditResponse> {
    return this.call<LayertwineEditRequest, LayertwineEditResponse>("Edit", request);
  }

  /**
   * Get repository status
   */
  async status(): Promise<LayertwineStatusResponse> {
    return this.call<Record<string, never>, LayertwineStatusResponse>("Status", {});
  }

  /**
   * Create a checkpoint
   */
  async commit(request: LayertwineCommitRequest): Promise<LayertwineCommitResponse> {
    return this.call<LayertwineCommitRequest, LayertwineCommitResponse>("Commit", request);
  }

  /**
   * Query history
   */
  async log(request: LayertwineLogRequest): Promise<LayertwineLogResponse> {
    return this.call<LayertwineLogRequest, LayertwineLogResponse>("Log", request);
  }

  /**
   * List branches
   */
  async branchList(): Promise<LayertwineBranchListResponse> {
    return this.call<Record<string, never>, LayertwineBranchListResponse>("BranchList", {});
  }

  /**
   * Agent edit
   */
  async agentEdit(request: LayertwineAgentEditRequest): Promise<LayertwineAgentEditResponse> {
    return this.call<LayertwineAgentEditRequest, LayertwineAgentEditResponse>("AgentEdit", request);
  }

  /**
   * Agent submit
   */
  async agentSubmit(request: LayertwineAgentSubmitRequest): Promise<LayertwineAgentSubmitResponse> {
    return this.call<LayertwineAgentSubmitRequest, LayertwineAgentSubmitResponse>("AgentSubmit", request);
  }

  /**
   * Approve changes
   */
  async approve(request: LayertwineApproveRequest): Promise<LayertwineApproveResponse> {
    return this.call<LayertwineApproveRequest, LayertwineApproveResponse>("Approve", request);
  }

  /**
   * Backup repository
   */
  async backup(request: LayertwineBackupRequest): Promise<LayertwineBackupResponse> {
    return this.call<LayertwineBackupRequest, LayertwineBackupResponse>("Backup", request);
  }

  /**
   * Restore full checkpoint
   */
  async restoreCheckpoint(request: LayertwineRestoreRequest): Promise<LayertwineRestoreResponse> {
    return this.call<LayertwineRestoreRequest, LayertwineRestoreResponse>("RestoreCheckpoint", request);
  }

  /**
   * Restore checkpoint selectively by source pattern
   */
  async restoreSelectiveCheckpoint(
    request: LayertwineSelectiveRestoreRequest
  ): Promise<LayertwineSelectiveRestoreResponse> {
    return this.call<LayertwineSelectiveRestoreRequest, LayertwineSelectiveRestoreResponse>(
      "RestoreSelectiveCheckpoint",
      request
    );
  }

  /**
   * Restore checkpoint at a specific timestamp
   */
  async restoreCheckpointByTime(
    request: LayertwineRestoreByTimeRequest
  ): Promise<LayertwineRestoreByTimeResponse> {
    return this.call<LayertwineRestoreByTimeRequest, LayertwineRestoreByTimeResponse>(
      "RestoreCheckpointByTime",
      request
    );
  }

  /**
   * Diff two checkpoints
   */
  async diffCheckpoints(request: LayertwineDiffRequest): Promise<LayertwineDiffResponse> {
    return this.call<LayertwineDiffRequest, LayertwineDiffResponse>("DiffCheckpoints", request);
  }

  /**
   * Get snapshot content
   */
  async getSnapshot(request: LayertwineGetSnapshotRequest): Promise<LayertwineGetSnapshotResponse> {
    return this.call<LayertwineGetSnapshotRequest, LayertwineGetSnapshotResponse>("GetSnapshot", request);
  }
}
