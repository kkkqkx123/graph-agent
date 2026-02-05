/**
 * SDK主类
 * 提供统一的API入口，整合所有功能模块
 */

import { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
import { ThreadRegistryAPI } from '../resources/threads/thread-registry-api';
import { NodeRegistryAPI } from '../resources/templates/node-template-registry-api';
import { TriggerTemplateRegistryAPI } from '../resources/templates/trigger-template-registry-api';
import { ToolRegistryAPI } from '../resources/tools/tool-registry-api';
import { ScriptRegistryAPI } from '../resources/scripts/script-registry-api';
import { ProfileRegistryAPI } from '../resources/profiles/profile-registry-api';

import { ThreadExecutorAPI } from '../operations/execution/thread-executor-api';
import { MessageManagerAPI } from '../operations/conversation/message-manager-api';
import { VariableManagerAPI } from '../operations/state/variable-manager-api';
import { CheckpointManagerAPI } from '../operations/state/checkpoint-manager-api';
import { TriggerManagerAPI } from '../operations/state/trigger-manager-api';
import { EventManagerAPI } from '../operations/events/event-manager-api';
import { LLMWrapperAPI } from '../operations/llm/llm-wrapper-api';
import { ToolExecutionAPI } from '../operations/tools/tool-execution-api';
import { ScriptExecutionAPI } from '../operations/code/script-execution-api';

import { WorkflowValidatorAPI } from '../validation/workflow-validator-api';

import type { SDKOptions, SDKDependencies } from '../types';

/**
 * SDK主类 - 统一API入口
 */
export class SDK {
  // 资源管理API实例
  public readonly workflows: WorkflowRegistryAPI;
  public readonly threads: ThreadRegistryAPI;
  public readonly nodeTemplates: NodeRegistryAPI;
  public readonly triggerTemplates: TriggerTemplateRegistryAPI;
  public readonly tools: ToolRegistryAPI;
  public readonly scripts: ScriptRegistryAPI;
  public readonly profiles: ProfileRegistryAPI;

  // 业务操作API实例
  public readonly execution: ThreadExecutorAPI;
  public readonly messages: MessageManagerAPI;
  public readonly variables: VariableManagerAPI;
  public readonly checkpoints: CheckpointManagerAPI;
  public readonly triggers: TriggerManagerAPI;
  public readonly events: EventManagerAPI;
  public readonly llm: LLMWrapperAPI;
  public readonly toolExecution: ToolExecutionAPI;
  public readonly scriptExecution: ScriptExecutionAPI;

  // 验证API实例
  public readonly validation: WorkflowValidatorAPI;

  /**
   * 创建SDK实例
   * @param options SDK配置选项
   * @param dependencies SDK依赖项
   */
  constructor(options?: SDKOptions, dependencies?: SDKDependencies) {
    // 初始化资源管理API
    this.workflows = new WorkflowRegistryAPI();
    this.threads = new ThreadRegistryAPI();
    this.nodeTemplates = new NodeRegistryAPI();
    this.triggerTemplates = new TriggerTemplateRegistryAPI();
    this.tools = new ToolRegistryAPI();
    this.scripts = new ScriptRegistryAPI();
    this.profiles = new ProfileRegistryAPI();

    // 初始化业务操作API
    this.execution = new ThreadExecutorAPI();
    this.messages = new MessageManagerAPI();
    this.variables = new VariableManagerAPI();
    this.checkpoints = new CheckpointManagerAPI();
    this.triggers = new TriggerManagerAPI();
    this.events = new EventManagerAPI();
    this.llm = new LLMWrapperAPI();
    this.toolExecution = new ToolExecutionAPI();
    this.scriptExecution = new ScriptExecutionAPI();

    // 初始化验证API
    this.validation = new WorkflowValidatorAPI();
  }

  /**
   * 获取SDK版本信息
   */
  getVersion(): string {
    return '2.0.0'; // 根据实际版本更新
  }

  /**
   * 获取SDK功能模块列表
   */
  getModules(): string[] {
    return [
      'workflows', 'threads', 'nodeTemplates', 'triggerTemplates', 'tools', 'scripts', 'profiles',
      'execution', 'messages', 'variables', 'checkpoints', 'triggers', 'events', 'llm', 
      'toolExecution', 'scriptExecution', 'validation'
    ];
  }

  /**
   * 检查SDK健康状态
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, string> }> {
    const details: Record<string, string> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // 检查各个模块的健康状态
    try {
      await this.workflows.getWorkflowCount();
      details['workflows'] = 'healthy';
    } catch (error) {
      details['workflows'] = 'unhealthy';
      overallStatus = 'degraded';
    }

    try {
      await this.threads.getThreadCount();
      details['threads'] = 'healthy';
    } catch (error) {
      details['threads'] = 'unhealthy';
      overallStatus = 'degraded';
    }

    try {
      await this.tools.getToolCount();
      details['tools'] = 'healthy';
    } catch (error) {
      details['tools'] = 'unhealthy';
      overallStatus = 'degraded';
    }

    try {
      await this.scripts.getScriptCount();
      details['scripts'] = 'healthy';
    } catch (error) {
      details['scripts'] = 'unhealthy';
      overallStatus = 'degraded';
    }

    return { status: overallStatus, details };
  }

  /**
   * 销毁SDK实例，清理资源
   */
  async destroy(): Promise<void> {
    // 清理各个模块的资源
    // 这里可以根据需要添加清理逻辑
    console.log('SDK实例已销毁');
  }
}

/**
 * 创建SDK实例的便捷函数
 */
export function createSDK(options?: SDKOptions, dependencies?: SDKDependencies): SDK {
  return new SDK(options, dependencies);
}

/**
 * 全局SDK实例（单例模式）
 */
let globalSDKInstance: SDK | null = null;

/**
 * 获取全局SDK实例
 */
export function getGlobalSDK(options?: SDKOptions, dependencies?: SDKDependencies): SDK {
  if (!globalSDKInstance) {
    globalSDKInstance = new SDK(options, dependencies);
  }
  return globalSDKInstance;
}

/**
 * 设置全局SDK实例
 */
export function setGlobalSDK(sdk: SDK): void {
  globalSDKInstance = sdk;
}

/**
 * 清除全局SDK实例
 */
export function clearGlobalSDK(): void {
  globalSDKInstance = null;
}