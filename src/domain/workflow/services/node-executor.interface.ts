import { NodeValueObject } from '../value-objects';

/**
 * 节点执行器接口
 *
 * 定义了节点执行的标准契约，包括执行、验证和类型支持
 * 具体实现在基础设施层提供
 */
export interface INodeExecutor {
  /**
   * 执行节点
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(node: NodeValueObject, context: any): Promise<any>;

  /**
   * 验证节点是否可以执行
   * @param node 节点实例
   * @param context 执行上下文
   * @returns 是否可以执行
   */
  canExecute(node: NodeValueObject, context: any): Promise<boolean>;

  /**
   * 获取执行器支持的节点类型
   * @returns 支持的节点类型列表
   */
  getSupportedNodeTypes(): string[];
}