/**
 * 节点处理函数模块
 * 提供各种节点类型的处理函数
 *
 * 注意：
 * - subgraph-node不需要处理器，因为已经通过graph合并了，运行时不存在此类节点
 * - tool-node由ThreadExecutor直接处理（LLM托管节点）
 * - 配置验证和转换逻辑在config-utils.ts中
 */

import { ExecutionError } from '../../../../types/errors';
import { NodeType } from '../../../../types/node';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';

/**
 * 节点处理函数类型
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export type NodeHandler = (thread: Thread, node: Node, context?: any) => Promise<any>;

// 导入各个节点处理函数
import { startHandler } from './start-handler';
import { endHandler } from './end-handler';
import { variableHandler } from './variable-handler';
import { codeHandler } from './code-handler';
import { forkHandler } from './fork-handler';
import { joinHandler } from './join-handler';
import { routeHandler } from './route-handler';
import { loopStartHandler } from './loop-start-handler';
import { loopEndHandler } from './loop-end-handler';
import { userInteractionHandler } from './user-interaction-handler';
import { contextProcessorHandler } from './context-processor-handler';
import { llmHandler } from './llm-handler';

/**
 * 节点处理函数映射
 *
 * 注意：节点类型是固定的（NodeType枚举），不需要注册机制
 * 处理器在模块加载时静态映射，不支持运行时扩展
 */
export const nodeHandlers: Record<NodeType, NodeHandler> = {
  [NodeType.START]: startHandler,
  [NodeType.END]: endHandler,
  [NodeType.VARIABLE]: variableHandler,
  [NodeType.CODE]: codeHandler,
  [NodeType.FORK]: forkHandler,
  [NodeType.JOIN]: joinHandler,
  [NodeType.ROUTE]: routeHandler,
  [NodeType.LOOP_START]: loopStartHandler,
  [NodeType.LOOP_END]: loopEndHandler,
  [NodeType.USER_INTERACTION]: userInteractionHandler,
  [NodeType.CONTEXT_PROCESSOR]: contextProcessorHandler,
  [NodeType.LLM]: llmHandler
} as Record<NodeType, NodeHandler>;

/**
 * 获取节点处理函数
 */
export function getNodeHandler(nodeType: NodeType): NodeHandler {
  const handler = nodeHandlers[nodeType];
  if (!handler) {
    throw new ExecutionError(`No handler found for node type: ${nodeType}`);
  }
  return handler;
}

// 导出各个节点处理函数（用于外部使用）
export { startHandler } from './start-handler';
export { endHandler } from './end-handler';
export { variableHandler } from './variable-handler';
export { codeHandler } from './code-handler';
export { forkHandler } from './fork-handler';
export { joinHandler } from './join-handler';
export { routeHandler } from './route-handler';
export { loopStartHandler } from './loop-start-handler';
export { loopEndHandler } from './loop-end-handler';
export { userInteractionHandler } from './user-interaction-handler';
export { contextProcessorHandler } from './context-processor-handler';
export { llmHandler } from './llm-handler';

// 以下节点由NodeExecutionCoordinator直接处理，需要访问高层模块
// - LLM_NODE（LLM托管节点）
// - TOOL_NODE（LLM托管节点）
// - USER_INTERACTION_NODE（LLM托管节点）
// - CONTEXT_PROCESSOR_NODE（需要访问ConversationManager）

// 导出配置工具函数
export * from './config-utils';