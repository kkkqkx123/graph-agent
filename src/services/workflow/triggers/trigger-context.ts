/**
 * 触发器执行上下文
 *
 * 提供触发器执行时所需的上下文信息
 *
 * 注意：这是 TriggerExecutor 使用的执行上下文，与 domain 层的 TriggerContext 不同
 * domain 层的 TriggerContext 用于 Trigger 实体的 evaluate() 方法
 */
export interface TriggerExecutionContext {
  /**
   * 工作流ID
   */
  workflowId: string;

  /**
   * 触发器ID
   */
  triggerId: string;

  /**
   * 触发器数据
   */
  triggerData?: Record<string, any>;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;

  /**
   * 触发器类型
   */
  triggerType?: string;

  /**
   * 上次触发时间
   */
  lastTriggered?: number;

  /**
   * 触发次数
   */
  triggerCount?: number;
}
