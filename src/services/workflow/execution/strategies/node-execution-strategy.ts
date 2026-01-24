/**
 * 节点执行策略接口
 * 
 * 定义节点执行策略的通用接口
 */

import { Node } from '../../../../domain/workflow/entities/node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';

/**
 * 节点执行策略接口
 */
export interface INodeExecutionStrategy {
  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult>;

  /**
   * 验证是否可以执行
   * @param node 节点实例
   * @returns 是否可以执行
   */
  canExecute(node: Node): boolean;
}