import { ValidationError } from '../../../common/exceptions';

/**
 * 工作流类型枚举（简化版）
 *
 * 工作流的执行模式由图拓扑结构和节点类型决定：
 * - SEQUENTIAL: 串行执行（默认），无特殊标记，按图拓扑顺序依次执行
 * - PARALLEL: 并行执行，通过ForkNode和JoinNode节点标记
 * - LOOP: 循环执行，通过LoopStart和LoopEnd节点标记
 */
export enum WorkflowType {
  /** 串行执行（默认） */
  SEQUENTIAL = 'sequential',
  /** 并行执行（通过Fork/Join节点标记） */
  PARALLEL = 'parallel',
  /** 循环执行（通过LoopStart/LoopEnd节点标记） */
  LOOP = 'loop',
}

/**
 * 验证工作流类型
 * @param type 待验证的类型字符串
 * @returns 是否为有效的工作流类型
 */
export function isValidWorkflowType(type: string): type is WorkflowType {
  return Object.values(WorkflowType).includes(type as WorkflowType);
}

/**
 * 从字符串创建工作流类型
 * @param type 类型字符串
 * @returns 工作流类型
 * @throws 如果类型无效则抛出错误
 */
export function parseWorkflowType(type: string): WorkflowType {
  if (!isValidWorkflowType(type)) {
    throw new ValidationError(`无效的工作流类型: ${type}，有效值为: ${Object.values(WorkflowType).join(', ')}`);
  }
  return type as WorkflowType;
}

/**
 * 获取工作流类型的描述
 * @param type 工作流类型
 * @returns 类型描述
 */
export function getWorkflowTypeDescription(type: WorkflowType): string {
  const descriptions: Record<WorkflowType, string> = {
    [WorkflowType.SEQUENTIAL]: '串行执行，按图拓扑顺序依次执行节点',
    [WorkflowType.PARALLEL]: '并行执行，通过ForkNode和JoinNode节点实现并行分支',
    [WorkflowType.LOOP]: '循环执行，通过LoopStart和LoopEnd节点实现循环控制',
  };
  return descriptions[type];
}
