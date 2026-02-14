/**
 * 工作流枚举类型定义
 */

/**
 * 工作流类型枚举
 * 用于区分不同类型的工作流，影响预处理时机和检查点策略
 */
export enum WorkflowType {
  /** 触发子工作流：必须包含START_FROM_TRIGGER和CONTINUE_FROM_TRIGGER节点，不包含start、end、subgraph节点 */
  TRIGGERED_SUBWORKFLOW = 'TRIGGERED_SUBWORKFLOW',
  /** 独立工作流：不包含EXECUTE_TRIGGERED_SUBGRAPH触发器，也不包含SUBGRAPH节点 */
  STANDALONE = 'STANDALONE',
  /** 依赖工作流：包含EXECUTE_TRIGGERED_SUBGRAPH触发器或SUBGRAPH节点 */
  DEPENDENT = 'DEPENDENT'
}