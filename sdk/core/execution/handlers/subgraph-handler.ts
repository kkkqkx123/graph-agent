/**
 * 子图处理函数
 * 负责处理子图的进入、退出、输入输出映射等逻辑
 *
 * 职责：
 * - 处理子图进入逻辑
 * - 处理子图退出逻辑
 * - 获取子图输入（使用现有的 resolvePath 函数）
 * - 获取子图输出
 * - 创建子图上下文元数据
 *
 * 设计原则：
 * - 复用现有的路径解析功能
 * - 不重复实现变量解析逻辑
 * - 提供清晰的子图处理接口
 * - 使用纯函数，无内部状态
 */

import { ThreadContext } from '../context/thread-context';
import type { SubgraphNodeConfig } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { resolvePath } from '../../../utils/evalutor/path-resolver';
import { now } from '../../../utils';

/**
 * 进入子图
 * @param threadContext 线程上下文
 * @param workflowId 子图工作流ID
 * @param parentWorkflowId 父工作流ID
 * @param input 子图输入
 */
export function enterSubgraph(
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
export function exitSubgraph(threadContext: ThreadContext): void {
  threadContext.exitSubgraph();
}

/**
 * 获取子图输入
 * @param threadContext 线程上下文
 * @param originalSubgraphNodeId 原始子图节点ID
 * @returns 子图输入数据
 */
export function getSubgraphInput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
  const navigator = threadContext.getNavigator();
  const graphNode = navigator.getGraph().getNode(originalSubgraphNodeId);
  const node = graphNode?.originalNode;

  if (node?.type === 'SUBGRAPH' as NodeType) {
    const config = node.config as SubgraphNodeConfig;
    return resolveSubgraphInput(threadContext, config);
  }

  return {};
}

/**
 * 解析子图输入映射
 * @param threadContext 线程上下文
 * @param config 子图节点配置
 * @returns 子图输入数据
 */
export function resolveSubgraphInput(threadContext: ThreadContext, config: SubgraphNodeConfig): Record<string, any> {
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

/**
 * 获取子图输出
 * @param threadContext 线程上下文
 * @param originalSubgraphNodeId 原始子图节点ID
 * @returns 子图输出数据
 */
export function getSubgraphOutput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
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

/**
 * 创建子图上下文元数据
 * @param triggerId 触发器ID（可选）
 * @param mainThreadId 主线程ID（可选）
 * @returns 子图上下文元数据
 */
export function createSubgraphMetadata(triggerId?: string, mainThreadId?: string): Record<string, any> {
  const metadata: Record<string, any> = {
    timestamp: now()
  };

  if (triggerId || mainThreadId) {
    metadata['triggeredBy'] = {
      triggerId,
      mainThreadId,
      timestamp: now()
    };
    metadata['isTriggeredSubgraph'] = true;
  }

  return metadata;
}