/**
 * 子图处理函数
 * 负责处理子图的进入、退出等逻辑
 *
 * 职责：
 * - 处理子图进入逻辑
 * - 处理子图退出逻辑
 * - 创建子图上下文元数据
 *
 * 设计原则：
 * - 复用现有的路径解析功能
 * - 不重复实现变量解析逻辑
 * - 提供清晰的子图处理接口
 * - 使用纯函数，无内部状态
 */

import type { ThreadEntity } from '../../entities/thread-entity.js';
import { now } from '@modular-agent/common-utils';

/**
 * 进入子图
 * @param threadEntity 线程实体
 * @param workflowId 子图工作流ID
 * @param parentWorkflowId 父工作流ID
 * @param input 子图输入
 */
export async function enterSubgraph(
  threadEntity: ThreadEntity,
  workflowId: string,
  parentWorkflowId: string,
  input: any
): Promise<void> {
  await threadEntity.enterSubgraph(workflowId, parentWorkflowId, input);
}

/**
 * 退出子图
 * @param threadEntity 线程实体
 */
export async function exitSubgraph(threadEntity: ThreadEntity): Promise<void> {
  await threadEntity.exitSubgraph();
}

/**
 * 获取子图输入
 * @param threadEntity 线程实体
 * @returns 子图输入数据（使用变量系统）
 */
export function getSubgraphInput(threadEntity: ThreadEntity): any {
  // 使用变量系统获取输入数据
  return threadEntity.getAllVariables();
}

/**
 * 获取子图输出
 * @param threadEntity 线程实体
 * @returns 子图输出数据
 */
export function getSubgraphOutput(threadEntity: ThreadEntity): any {
  const subgraphContext = threadEntity.getCurrentSubgraphContext();
  if (!subgraphContext) return {};

  // 获取子图的END节点输出
  const graph = threadEntity.getGraph();
  const endNodes = graph.endNodeIds;

  for (const endNodeId of endNodes) {
    const graphNode = graph.getNode(endNodeId);
    if (graphNode?.workflowId === subgraphContext.workflowId) {
      // 找到子图的END节点，获取其输出
      const nodeResult = threadEntity.getNodeResults()
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
