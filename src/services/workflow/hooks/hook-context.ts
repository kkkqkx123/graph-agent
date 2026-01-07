import { HookPointValue } from '../../../domain/workflow/value-objects/hook-point';

/**
 * 钩子执行上下文
 *
 * 提供钩子执行时所需的上下文信息
 */
export interface HookContext {
  /**
   * 工作流ID
   */
  workflowId?: string;

  /**
   * 执行ID
   */
  executionId?: string;

  /**
   * 钩子配置数据
   */
  config?: Record<string, any>;

  /**
   * 元数据（节点执行结果等）
   */
  metadata?: Record<string, any>;

  /**
   * 钩子执行点
   */
  hookPoint?: HookPointValue;

  /**
   * 触发钩子的事件类型
   */
  eventType?: string;

  /**
   * 事件数据
   */
  eventData?: Record<string, any>;
}
