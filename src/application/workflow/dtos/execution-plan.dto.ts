import { ExecutionStepDto } from './execution-step.dto';
import { ExecutionDependencyDto } from './execution-dependency.dto';

/**
 * 执行计划DTO
 */
export interface ExecutionPlanDto {
  /** 执行计划ID */
  id: string;
  /** 图ID */
  workflowId: string;
  /** 执行模式 */
  executionMode: 'sequential' | 'parallel' | 'conditional';
  /** 执行步骤 */
  steps: ExecutionStepDto[];
  /** 依赖关系 */
  dependencies: ExecutionDependencyDto[];
  /** 预估执行时间（毫秒） */
  estimatedDuration: number;
  /** 创建时间 */
  createdAt: string;
}
