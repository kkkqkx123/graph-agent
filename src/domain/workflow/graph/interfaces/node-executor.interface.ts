import { Node } from '../entities/node';

/**
 * 节点执行器接口
 *
 * 注意：这里的 ExecutionContext 使用基础设施层的定义，
 * 因为节点执行器是在基础设施层实现的
 */
export interface INodeExecutor {
  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文（基础设施层）
   * @returns 执行结果
   */
  execute(node: Node, context: any): Promise<any>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: Node, context: any): Promise<boolean>;

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[];
}