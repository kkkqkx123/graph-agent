import { IWorkflowFunction, WorkflowFunctionType } from './workflow-function.interface';
import { IExecutionContext } from '../../graph/interfaces/execution-context.interface';

/**
 * 触发器函数接口
 * 
 * 用于决定何时触发工作流执行，返回布尔值结果
 */
export interface ITriggerFunction extends IWorkflowFunction {
  readonly type: WorkflowFunctionType.TRIGGER;

  /**
   * 判断是否应该触发
   * @param context 执行上下文
   * @param config 触发器配置
   * @returns 是否应该触发
   */
  shouldTrigger(context: IExecutionContext, config: any): Promise<boolean>;
}