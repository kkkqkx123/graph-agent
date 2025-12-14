import { IWorkflowFunction, WorkflowFunctionType } from './workflow-function.interface';
import { IExecutionContext } from '../../graph/interfaces/execution-context.interface';

/**
 * 节点函数接口
 * 
 * 用于执行特定类型的节点逻辑，返回执行结果
 */
export interface INodeFunction extends IWorkflowFunction {
  readonly type: WorkflowFunctionType.NODE;

  /**
   * 执行节点函数
   * @param context 执行上下文
   * @param config 节点配置
   * @returns 执行结果
   */
  execute(context: IExecutionContext, config: any): Promise<any>;

  /**
   * 检查是否可以执行
   * @param context 执行上下文
   * @param config 节点配置
   * @returns 是否可以执行
   */
  canExecute(context: IExecutionContext, config: any): Promise<boolean>;
}