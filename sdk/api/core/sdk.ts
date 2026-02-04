/**
 * SDK V2 - 改进的SDK类
 * 提供流畅的链式API和更好的易用性
 */

import { ThreadExecutorAPI } from './thread-executor-api';
import { WorkflowRegistryAPI } from '../registry/workflow-registry-api';
import { ThreadRegistryAPI } from '../registry/thread-registry-api';
import { WorkflowValidatorAPI } from '../validation/workflow-validator-api';
import { ToolServiceAPI } from '../tools/tool-service-api';
import { CodeServiceAPI } from '../code/code-service-api';
import { LLMWrapperAPI } from '../llm/llm-wrapper-api';
import { ProfileManagerAPI } from '../llm/profile-manager-api';
import { EventManagerAPI } from '../management/event-manager-api';
import { CheckpointManagerAPI } from '../management/checkpoint-manager-api';
import { VariableManagerAPI } from '../management/variable-manager-api';
import { NodeRegistryAPI } from '../template-registry/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../template-registry/trigger-template-registry-api';
import { TriggerManagerAPI } from '../management/trigger-manager-api';
import { MessageManagerAPI } from '../conversation/message-manager-api';
import { workflowRegistry, type WorkflowRegistry } from '../../core/services/workflow-registry';
import { threadRegistry, type ThreadRegistry } from '../../core/services/thread-registry';
import type { SDKOptions, SDKDependencies } from '../types/core-types';
import { WorkflowBuilder } from '../builders/workflow-builder';
import { ExecutionBuilder } from '../builders/execution-builder';
import type { WorkflowDefinition } from '../../types/workflow';

/**
 * SDK - SDK类
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

  /** 脚本管理API */
  public readonly scripts: CodeServiceAPI;

  /** LLM调用API */
  public readonly llm: LLMWrapperAPI;

  /** Profile管理API */
  public readonly profiles: ProfileManagerAPI;

  /** 事件监听API */
  public readonly events: EventManagerAPI;

  /** 检查点管理API */
  public readonly checkpoints: CheckpointManagerAPI;

  /** 变量管理API */
  public readonly variables: VariableManagerAPI;

  /** 节点模板管理API */
  public readonly nodeTemplates: NodeRegistryAPI;

  /** 触发器模板管理API */
  public readonly triggerTemplates: TriggerTemplateRegistryAPI;

  /** 触发器管理API */
  public readonly triggers: TriggerManagerAPI;

  /** 消息管理API */
  public readonly messages: MessageManagerAPI;

  /** 内部工作流注册表 */
  private readonly internalWorkflowRegistry: WorkflowRegistry;

  /** 内部线程注册表 */
  private readonly internalThreadRegistry: ThreadRegistry;

  constructor(options?: SDKOptions, dependencies?: SDKDependencies) {
    // 使用传入的依赖或全局单例
    this.internalWorkflowRegistry = dependencies?.workflowRegistry || workflowRegistry;
    this.internalThreadRegistry = dependencies?.threadRegistry || options?.threadRegistry || threadRegistry;

    // 初始化API模块
    this.workflows = new WorkflowRegistryAPI({
      enableVersioning: options?.enableVersioning ?? true,
      maxVersions: options?.maxVersions ?? 10
    });
    this.threads = new ThreadRegistryAPI(this.internalThreadRegistry);
    this.validator = new WorkflowValidatorAPI();
    this.executor = new ThreadExecutorAPI(
      this.internalWorkflowRegistry,
      dependencies?.executionContext
    );
    this.tools = new ToolServiceAPI();
    this.scripts = new CodeServiceAPI();
    this.llm = new LLMWrapperAPI();
    this.profiles = new ProfileManagerAPI();
    this.events = new EventManagerAPI();
    this.checkpoints = new CheckpointManagerAPI();
    this.variables = new VariableManagerAPI(this.internalThreadRegistry);
    this.nodeTemplates = new NodeRegistryAPI();
    this.triggerTemplates = new TriggerTemplateRegistryAPI();
    this.triggers = new TriggerManagerAPI(this.internalThreadRegistry);
    this.messages = new MessageManagerAPI(this.internalThreadRegistry);
  }

  /**
   * 创建SDK实例
   * @param options SDK配置选项
   * @returns Promise<SDKV2>
   */
  static async create(options?: SDKOptions): Promise<SDK> {
    const sdk = new SDK(options);
    await sdk.initialize();
    return sdk;
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
    await this.scripts.clearScripts();
    await this.llm.clearAll();
    await this.profiles.clearProfiles();
    await this.events.clearHistory();
    await this.checkpoints.clearAllCheckpoints();
    await this.nodeTemplates.clearTemplates();
    await this.triggerTemplates.clearTemplates();
    // 注意：MessageManagerAPI不需要清理，因为消息是线程的一部分
  }

  /**
   * 获取SDK版本信息
   * @returns 版本信息
   */
  getVersion(): string {
    return '2.0.0';
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
    scriptCount: number;
    profileCount: number;
    eventListenerCount: number;
    checkpointCount: number;
    nodeTemplateCount: number;
    triggerTemplateCount: number;
  }> {
    const workflowCount = await this.workflows.getWorkflowCount();
    const threadCount = await this.threads.getThreadCount();
    const threadStatistics = await this.threads.getThreadStatistics();
    const toolCount = await this.tools.getToolCount();
    const scriptCount = await this.scripts.getScriptCount();
    const profileCount = await this.profiles.getProfileCount();
    const eventListenerCount = await this.events.getListenerCount();
    const checkpointCount = await this.checkpoints.getCheckpointCount();
    const nodeTemplateCount = await this.nodeTemplates.getTemplateCount();
    const triggerTemplateCount = await this.triggerTemplates.getTemplateCount();

    return {
      version: this.getVersion(),
      workflowCount,
      threadCount,
      threadStatistics,
      toolCount,
      scriptCount,
      profileCount,
      eventListenerCount,
      checkpointCount,
      nodeTemplateCount,
      triggerTemplateCount
    };
  }

  /**
   * 工作流构建器 - 流畅API
   * @param workflowId 工作流ID
   * @returns WorkflowBuilder实例
   */
  workflow(workflowId: string): WorkflowBuilder {
    return WorkflowBuilder.create(workflowId);
  }

  /**
   * 执行构建器 - 流畅API
   * @param workflowId 工作流ID
   * @returns ExecutionBuilder实例
   */
  execute(workflowId: string): ExecutionBuilder {
    return new ExecutionBuilder(this.executor).withWorkflow(workflowId);
  }

  /**
   * 工具构建器 - 流畅API
   * @param toolName 工具名称
   * @returns 工具执行构建器
   */
  tool(toolName: string) {
    return {
      execute: async (parameters: Record<string, any>) => {
        return this.tools.executeTool(toolName, parameters);
      },
      test: async (parameters: Record<string, any>) => {
        return this.tools.testTool(toolName, parameters);
      }
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