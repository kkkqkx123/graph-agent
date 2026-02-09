/**
 * SDKAPIDependencies - SDK API依赖实现
 * 实现APIDependencies接口，提供API层所需的所有Core层服务实例
 *
 * 设计原则：
 * - 封装ExecutionContext的复杂性
 * - 提供统一的依赖获取方式
 * - 支持测试隔离
 */

import { ExecutionContext } from '../../core/execution/context/execution-context';
import { APIDependencies } from './api-dependencies';
import { codeService } from '../../core/services/code-service';
import { nodeTemplateRegistry } from '../../core/services/node-template-registry';
import { triggerTemplateRegistry } from '../../core/services/trigger-template-registry';

/**
 * SDK API依赖实现类
 * 通过ExecutionContext管理所有依赖实例
 */
export class SDKAPIDependencies implements APIDependencies {
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
  getWorkflowRegistry(): any {
    return this.executionContext.getWorkflowRegistry();
  }
  
  /**
   * 获取线程注册表
   */
  getThreadRegistry(): any {
    return this.executionContext.getThreadRegistry();
  }
  
  /**
   * 获取事件管理器
   */
  getEventManager(): any {
    return this.executionContext.getEventManager();
  }
  
  /**
   * 获取检查点状态管理器
   */
  getCheckpointStateManager(): any {
    return this.executionContext.getCheckpointStateManager();
  }
  
  /**
   * 获取工具服务
   */
  getToolService(): any {
    return this.executionContext.getToolService();
  }
  
  /**
   * 获取LLM执行器
   */
  getLlmExecutor(): any {
    return this.executionContext.getLlmExecutor();
  }
  
  /**
   * 获取图注册表
   */
  getGraphRegistry(): any {
    return this.executionContext.getGraphRegistry();
  }
  
  /**
   * 获取代码服务
   */
  getCodeService(): any {
    return codeService;
  }
  
  /**
   * 获取节点模板注册表
   */
  getNodeTemplateRegistry(): any {
    return nodeTemplateRegistry;
  }
  
  /**
   * 获取触发器模板注册表
   */
  getTriggerTemplateRegistry(): any {
    return triggerTemplateRegistry;
  }
  
  /**
   * 获取底层ExecutionContext实例（用于高级用例）
   */
  getExecutionContext(): ExecutionContext {
    return this.executionContext;
  }
}