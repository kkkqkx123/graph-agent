/**
 * APIDependencies - API层依赖接口
 * 定义API层所需的所有Core层依赖
 * 
 * 设计原则：
 * - 严格约束实例获取方式
 * - 保证API层不会以错误的方式获取各类实例
 * - 规范化依赖管理
 */

import type { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import type { ThreadRegistry } from '@modular-agent/sdk/core/services/thread-registry';
import type { EventManager } from '@modular-agent/sdk/core/services/event-manager';
import type { CheckpointStateManager } from '@modular-agent/sdk/core/execution/managers/checkpoint-state-manager';
import type { ToolService } from '@modular-agent/sdk/core/services/tool-service';
import type { LLMExecutor } from '@modular-agent/sdk/core/execution/executors/llm-executor';
import type { GraphRegistry } from '@modular-agent/sdk/core/services/graph-registry';
import type { CodeService } from '@modular-agent/sdk/core/services/code-service';
import type { NodeTemplateRegistry } from '@modular-agent/sdk/core/services/node-template-registry';
import type { TriggerTemplateRegistry } from '@modular-agent/sdk/core/services/trigger-template-registry';

/**
 * API层依赖接口
 * 提供所有API层需要的Core层服务实例
 */
export interface APIDependencies {
  /** 获取工作流注册表 */
  getWorkflowRegistry(): WorkflowRegistry;
  
  /** 获取线程注册表 */
  getThreadRegistry(): ThreadRegistry;
  
  /** 获取事件管理器 */
  getEventManager(): EventManager;
  
  /** 获取检查点状态管理器 */
  getCheckpointStateManager(): CheckpointStateManager;
  
  /** 获取工具服务 */
  getToolService(): ToolService;
  
  /** 获取LLM执行器 */
  getLlmExecutor(): LLMExecutor;
  
  /** 获取图注册表 */
  getGraphRegistry(): GraphRegistry;
  
  /** 获取代码服务 */
  getCodeService(): CodeService;
  
  /** 获取节点模板注册表 */
  getNodeTemplateRegistry(): NodeTemplateRegistry;
  
  /** 获取触发器模板注册表 */
  getTriggerTemplateRegistry(): TriggerTemplateRegistry;
}