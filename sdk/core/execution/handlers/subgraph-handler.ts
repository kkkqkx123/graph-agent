/**
 * SubgraphHandler - 子图处理器
 * 负责处理子图的进入、退出、输入输出映射等逻辑
 * 
 * 职责：
 * - 处理子图进入逻辑
 * - 处理子图退出逻辑
 * - 获取子图输入（使用现有的 resolvePath 函数）
 * - 获取子图输出
 * 
 * 设计原则：
 * - 复用现有的路径解析功能
 * - 不重复实现变量解析逻辑
 * - 提供清晰的子图处理接口
 */

import { ThreadContext } from '../context/thread-context';
import type { SubgraphNodeConfig } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { resolvePath } from '../../../utils/evalutor/path-resolver';

/**
 * 子图处理器
 */
export class SubgraphHandler {
  /**
   * 进入子图
   * @param threadContext 线程上下文
   * @param workflowId 子图工作流ID
   * @param parentWorkflowId 父工作流ID
   * @param input 子图输入
   */
  enterSubgraph(
    threadContext: ThreadContext,
    workflowId: string,
    parentWorkflowId: string,
    input: any
  ): void {
    threadContext.enterSubgraph(workflowId, parentWorkflowId, input);
  }

  /**
   * 退出子图
   * @param threadContext 线程上下文
   */
  exitSubgraph(threadContext: ThreadContext): void {
    threadContext.exitSubgraph();
  }

  /**
   * 获取子图输入
   * @param threadContext 线程上下文
   * @param originalSubgraphNodeId 原始子图节点ID
   * @returns 子图输入数据
   */
  getSubgraphInput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(originalSubgraphNodeId);
    const node = graphNode?.originalNode;

    if (node?.type === 'SUBGRAPH' as NodeType) {
      const config = node.config as SubgraphNodeConfig;
      const input: Record<string, any> = {};

      // 构建上下文对象用于路径解析
      const context = {
        variables: threadContext.getAllVariables(),
        input: threadContext.getInput(),
        output: threadContext.getOutput()
      };

      // 使用现有的 resolvePath 函数进行输入映射
      for (const [childVar, parentPath] of Object.entries(config.inputMapping)) {
        input[childVar] = resolvePath(parentPath, context);
      }

      return input;
    }

    return {};
  }

  /**
   * 获取子图输出
   * @param threadContext 线程上下文
   * @param originalSubgraphNodeId 原始子图节点ID
   * @returns 子图输出数据
   */
  getSubgraphOutput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    const subgraphContext = threadContext.getCurrentSubgraphContext();
    if (!subgraphContext) return {};

    // 获取子图的END节点输出
    const navigator = threadContext.getNavigator();
    const endNodes = navigator.getGraph().endNodeIds;

    for (const endNodeId of endNodes) {
      const graphNode = navigator.getGraph().getNode(endNodeId);
      if (graphNode?.workflowId === subgraphContext.workflowId) {
        // 找到子图的END节点，获取其输出
        const nodeResult = threadContext.getNodeResults()
          .find(r => r.nodeId === endNodeId);
        return nodeResult?.data || {};
      }
    }

    return {};
  }
}