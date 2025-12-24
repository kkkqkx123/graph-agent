/**
 * 执行依赖DTO
 */
export interface ExecutionDependencyDto {
  /** 源步骤ID */
  fromStepId: string;
  /** 目标步骤ID */
  toStepId: string;
  /** 依赖类型 */
  type: 'success' | 'failure' | 'completion' | 'conditional';
  /** 条件表达式 */
  condition?: string;
}