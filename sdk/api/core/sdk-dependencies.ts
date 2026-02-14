/**
 * APIDependencyManager - API依赖管理类
 * 统一管理API层所需的所有Core层依赖
 *
 * 设计原则：
 * - 严格约束实例获取方式
 * - 保证API层不会以错误的方式获取各类实例
 * - 规范化依赖管理
 * - 所有方法返回具体类型，确保类型安全
 * - 统一通过ExecutionContext获取依赖
 */

import { ExecutionContext } from '../../core/execution/context/execution-context';
import type { WorkflowRegistry } from '../../core/services/workflow-registry';
import type { ThreadRegistry } from '../../core/services/thread-registry';
import type { EventManager } from '../../core/services/event-manager';
import type { CheckpointStateManager } from '../../core/execution/managers/checkpoint-state-manager';
import type { ToolService } from '../../core/services/tool-service';
import type { LLMExecutor } from '../../core/execution/executors/llm-executor';
import type { CodeService } from '../../core/services/code-service';
import type { NodeTemplateRegistry } from '../../core/services/node-template-registry';
import type { TriggerTemplateRegistry } from '../../core/services/trigger-template-registry';
import type { GraphRegistry } from '../../core/services/graph-registry';
import { codeService } from '../../core/services/code-service';
import { nodeTemplateRegistry } from '../../core/services/node-template-registry';
import { triggerTemplateRegistry } from '../../core/services/trigger-template-registry';
import { graphRegistry } from '../../core/services/graph-registry';

/**
 * API依赖管理类
 * 通过ExecutionContext管理所有依赖实例
 */
export class APIDependencyManager {
  private executionContext: ExecutionContext;
  
  /**
   * 构造函数
   * 创建默认的ExecutionContext
   */
  constructor() {
    this.executionContext = ExecutionContext.createDefault();
  }
  
  /**
   * 获取工作流注册表
   */
  getWorkflowRegistry(): WorkflowRegistry {
    return this.executionContext.getWorkflowRegistry();
  }
  
  /**
   * 获取线程注册表
   */
  getThreadRegistry(): ThreadRegistry {
    return this.executionContext.getThreadRegistry();
  }
  
  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.executionContext.getEventManager();
  }
  
  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): CheckpointStateManager {
    return this.executionContext.getCheckpointStateManager();
  }
  
  /**
   * 获取工具服务
   */
  getToolService(): ToolService {
    return this.executionContext.getToolService();
  }
  
  /**
   * 获取LLM执行器
   */
  getLlmExecutor(): LLMExecutor {
    return this.executionContext.getLlmExecutor();
  }
  
  /**
   * 获取代码服务
   */
  getCodeService(): CodeService {
    return codeService;
  }
  
  /**
   * 获取节点模板注册表
   */
  getNodeTemplateRegistry(): NodeTemplateRegistry {
    return nodeTemplateRegistry;
  }
  
  /**
   * 获取触发器模板注册表
   */
  getTriggerTemplateRegistry(): TriggerTemplateRegistry {
    return triggerTemplateRegistry;
  }
  
  /**
   * 获取图注册表
   */
  getGraphRegistry(): GraphRegistry {
    return graphRegistry;
  }
  
  /**
   * 获取底层ExecutionContext实例（用于高级用例）
   */
  getExecutionContext(): ExecutionContext {
    return this.executionContext;
  }
}