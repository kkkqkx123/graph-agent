/**
 * SDK - 主SDK类
 * 整合所有API模块，提供统一的访问接口
 */

import { ThreadExecutorAPI } from './thread-executor-api';
import { WorkflowRegistryAPI } from './workflow-registry-api';
import { ThreadRegistryAPI } from './thread-registry-api';
import { WorkflowValidatorAPI } from './workflow-validator-api';
import { ToolServiceAPI } from './tool-service-api';
import { LLMWrapperAPI } from './llm-wrapper-api';
import { ProfileManagerAPI } from './profile-manager-api';
import { EventManagerAPI } from './event-manager-api';
import { WorkflowRegistry } from '../core/execution/registrys/workflow-registry';
import { ThreadRegistry } from '../core/execution/registrys/thread-registry';
import type { SDKOptions } from './types';

/**
 * SDK - 主SDK类
 */
export class SDK {
  /** 执行API */
  public readonly executor: ThreadExecutorAPI;

  /** 工作流管理API */
  public readonly workflows: WorkflowRegistryAPI;

  /** 线程管理API */
  public readonly threads: ThreadRegistryAPI;

  /** 验证管理API */
  public readonly validator: WorkflowValidatorAPI;

  /** 工具管理API */
  public readonly tools: ToolServiceAPI;

  /** LLM调用API */
  public readonly llm: LLMWrapperAPI;

  /** Profile管理API */
  public readonly profiles: ProfileManagerAPI;

  /** 事件监听API */
  public readonly events: EventManagerAPI;

  /** 内部工作流注册表 */
  private readonly internalWorkflowRegistry: WorkflowRegistry;

  /** 内部线程注册表 */
  private readonly internalThreadRegistry: ThreadRegistry;

  constructor(options?: SDKOptions) {
    // 创建内部注册表
    this.internalWorkflowRegistry = options?.workflowRegistry || new WorkflowRegistry({
      enableVersioning: options?.enableVersioning ?? true,
      maxVersions: options?.maxVersions ?? 10
    });
    this.internalThreadRegistry = options?.threadRegistry || new ThreadRegistry();

    // 初始化API模块
    this.workflows = new WorkflowRegistryAPI({
      enableVersioning: options?.enableVersioning ?? true,
      maxVersions: options?.maxVersions ?? 10
    });
    this.threads = new ThreadRegistryAPI(this.internalThreadRegistry);
    this.validator = new WorkflowValidatorAPI();
    this.executor = new ThreadExecutorAPI(this.internalWorkflowRegistry);
    this.tools = new ToolServiceAPI();
    this.llm = new LLMWrapperAPI();
    this.profiles = new ProfileManagerAPI();
    this.events = new EventManagerAPI();
  }

  /**
   * 初始化SDK
   * @returns Promise<void>
   */
  async initialize(): Promise<void> {
    // SDK初始化逻辑（如果需要）
    // 目前不需要特殊初始化
  }

  /**
   * 关闭SDK
   * @returns Promise<void>
   */
  async shutdown(): Promise<void> {
    // 清理资源
    await this.workflows.clearWorkflows();
    await this.threads.clearThreads();
    await this.tools.clearTools();
    await this.llm.clearAll();
    await this.profiles.clearProfiles();
    await this.events.clearHistory();
  }

  /**
   * 获取SDK版本信息
   * @returns 版本信息
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * 获取SDK状态信息
   * @returns 状态信息
   */
  async getStatus(): Promise<{
    version: string;
    workflowCount: number;
    threadCount: number;
    threadStatistics: any;
    toolCount: number;
    profileCount: number;
    eventListenerCount: number;
  }> {
    const workflowCount = await this.workflows.getWorkflowCount();
    const threadCount = await this.threads.getThreadCount();
    const threadStatistics = await this.threads.getThreadStatistics();
    const toolCount = await this.tools.getToolCount();
    const profileCount = await this.profiles.getProfileCount();
    const eventListenerCount = this.events.getListenerCount();

    return {
      version: this.getVersion(),
      workflowCount,
      threadCount,
      threadStatistics,
      toolCount,
      profileCount,
      eventListenerCount
    };
  }

  /**
   * 获取内部工作流注册表
   * @returns WorkflowRegistry实例
   */
  getInternalWorkflowRegistry(): WorkflowRegistry {
    return this.internalWorkflowRegistry;
  }

  /**
   * 获取内部线程注册表
   * @returns ThreadRegistry实例
   */
  getInternalThreadRegistry(): ThreadRegistry {
    return this.internalThreadRegistry;
  }
}