/**
 * 节点处理函数模块
 * 提供各种节点类型的处理函数
 * subgraph-node不需要处理器，因为已经通过graph合并了，运行时不存在此类节点
 * llm-node、user-interaction-node、context-processor-node、tool-node都通过内部事件托管给llm执行器
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';

/**
 * 节点处理函数类型
 */
export type NodeHandler = (thread: Thread, node: Node) => Promise<any>;

/**
 * 节点处理函数映射
 */
export const nodeHandlers: Record<NodeType, NodeHandler> = {} as Record<NodeType, NodeHandler>;

/**
 * 注册节点处理函数
 */
export function registerNodeHandler(nodeType: NodeType, handler: NodeHandler): void {
  nodeHandlers[nodeType] = handler;
}

/**
 * 获取节点处理函数
 */
export function getNodeHandler(nodeType: NodeType): NodeHandler {
  const handler = nodeHandlers[nodeType];
  if (!handler) {
    throw new Error(`No handler found for node type: ${nodeType}`);
  }
  return handler;
}

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

// 注册各个节点处理函数
registerNodeHandler(NodeType.START, startHandler);
registerNodeHandler(NodeType.END, endHandler);
registerNodeHandler(NodeType.VARIABLE, variableHandler);
registerNodeHandler(NodeType.CODE, codeHandler);
registerNodeHandler(NodeType.FORK, forkHandler);
registerNodeHandler(NodeType.JOIN, joinHandler);
registerNodeHandler(NodeType.ROUTE, routeHandler);
registerNodeHandler(NodeType.LOOP_START, loopStartHandler);
registerNodeHandler(NodeType.LOOP_END, loopEndHandler);

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

// 以下节点由ThreadExecutor直接托管给LLM执行器处理，不在此处实现
// - LLM_NODE
// - TOOL_NODE
// - CONTEXT_PROCESSOR_NODE
// - USER_INTERACTION_NODE