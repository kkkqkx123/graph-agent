import { IWorkflowFunction, WorkflowFunctionType } from './workflow-function.interface';
import { IExecutionContext } from '../../graph/interfaces/execution-context.interface';

/**
 * 条件函数接口
 * 
 * 用于评估工作流状态中的条件，返回布尔值结果
 */
export interface IConditionFunction extends IWorkflowFunction {
  readonly type: WorkflowFunctionType.CONDITION;

  /**
   * 评估条件
   * @param context 执行上下文
   * @param config 条件配置
   * @returns 条件是否满足
   */
  evaluate(context: IExecutionContext, config: any): Promise<boolean>;
}