import { IWorkflowFunction, WorkflowFunctionType } from './workflow-function.interface';
import { IExecutionContext } from '../../graph/interfaces/execution-context.interface';

/**
 * 路由函数接口
 * 
 * 用于决定工作流的下一步路径，返回目标节点ID
 */
export interface IRoutingFunction extends IWorkflowFunction {
  readonly type: WorkflowFunctionType.ROUTING;

  /**
   * 执行路由决策
   * @param context 执行上下文
   * @param params 路由参数
   * @returns 目标节点ID，null表示无有效目标
   */
  route(context: IExecutionContext, params: any): Promise<string | null>;
}