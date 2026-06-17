/**
 * Stratum gRPC Executor
 *
 * Encapsulates all communication details with the Stratum gRPC service
 * Supports embedded (SDK auto-starts binary) and remote (pre-deployed) modes
 */

import { BaseRemoteExecutor } from "../../BaseRemoteExecutor.js";
import type { RemoteConnectionConfig, RemoteExecutorStatus } from "../../types.js";
import { GrpcClient } from "../../../../transport/grpc/GrpcClient.js";
import { StratumProcessManager } from "./stratum-process.js";
import type {
  StratumInitRequest,
  StratumInitResponse,
  StratumEditRequest,
  StratumEditResponse,
  StratumStatusResponse,
  StratumCommitRequest,
  StratumCommitResponse,
  StratumLogRequest,
  StratumLogResponse,
  StratumBranchListResponse,
  StratumAgentEditRequest,
  StratumAgentEditResponse,
  StratumAgentSubmitRequest,
  StratumAgentSubmitResponse,
  StratumApproveRequest,
  StratumApproveResponse,
  StratumBackupRequest,
  StratumBackupResponse,
} from "./types.js";

export type StratumDeployMode = "embedded" | "remote";

export interface StratumExecutorConfig {
  deployMode: StratumDeployMode;
  // Remote mode
  address?: string;
  // Embedded mode
  binaryPath?: string;
  dbPath?: string;
  protoPath?: string;
}

/**
 * Stratum gRPC Executor
 */
export class StratumExecutor extends BaseRemoteExecutor {
  private grpcClient: GrpcClient | null = null;
  private config: StratumExecutorConfig;
  private mode: StratumDeployMode;
  private processManager: StratumProcessManager | null = null;

  constructor(config: StratumExecutorConfig) {
    super();
    this.config = config;
    this.mode = config.deployMode;
  }

  /**
   * Connect to Stratum service
   */
  async connect(connectionConfig: RemoteConnectionConfig): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // For embedded mode: start the Stratum process
      if (this.mode === "embedded") {
        if (!this.config.binaryPath || !this.config.dbPath) {
          throw new Error("binaryPath and dbPath are required for embedded mode");
        }

        this.processManager = new StratumProcessManager({
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
        serviceName: "stratum.Stratum",
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
   * Disconnect from Stratum service
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
      throw new Error("Stratum executor not connected");
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
    return "stratum-grpc";
  }

  // ══════════════════════════════════════════════════════════════
  // Stratum Convenience Methods
  // ══════════════════════════════════════════════════════════════

  /**
   * Initialize repository
   */
  async init(request: StratumInitRequest): Promise<StratumInitResponse> {
    return this.call<StratumInitRequest, StratumInitResponse>("Init", request);
  }

  /**
   * Edit a file
   */
  async edit(request: StratumEditRequest): Promise<StratumEditResponse> {
    return this.call<StratumEditRequest, StratumEditResponse>("Edit", request);
  }

  /**
   * Get repository status
   */
  async status(): Promise<StratumStatusResponse> {
    return this.call<Record<string, never>, StratumStatusResponse>("Status", {});
  }

  /**
   * Create a checkpoint
   */
  async commit(request: StratumCommitRequest): Promise<StratumCommitResponse> {
    return this.call<StratumCommitRequest, StratumCommitResponse>("Commit", request);
  }

  /**
   * Query history
   */
  async log(request: StratumLogRequest): Promise<StratumLogResponse> {
    return this.call<StratumLogRequest, StratumLogResponse>("Log", request);
  }

  /**
   * List branches
   */
  async branchList(): Promise<StratumBranchListResponse> {
    return this.call<Record<string, never>, StratumBranchListResponse>("BranchList", {});
  }

  /**
   * Agent edit
   */
  async agentEdit(request: StratumAgentEditRequest): Promise<StratumAgentEditResponse> {
    return this.call<StratumAgentEditRequest, StratumAgentEditResponse>("AgentEdit", request);
  }

  /**
   * Agent submit
   */
  async agentSubmit(request: StratumAgentSubmitRequest): Promise<StratumAgentSubmitResponse> {
    return this.call<StratumAgentSubmitRequest, StratumAgentSubmitResponse>("AgentSubmit", request);
  }

  /**
   * Approve changes
   */
  async approve(request: StratumApproveRequest): Promise<StratumApproveResponse> {
    return this.call<StratumApproveRequest, StratumApproveResponse>("Approve", request);
  }

  /**
   * Backup repository
   */
  async backup(request: StratumBackupRequest): Promise<StratumBackupResponse> {
    return this.call<StratumBackupRequest, StratumBackupResponse>("Backup", request);
  }
}