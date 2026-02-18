/**
 * 节点处理函数模块
 * 提供各种节点类型的处理函数
 *
 * 注意：
 * - subgraph-node不需要处理器，因为已经通过graph合并了，运行时不存在此类节点
 * - tool-node由ThreadExecutor直接处理（LLM托管节点）
 * - 配置验证和转换逻辑在config-utils.ts中
 */

import { ExecutionError } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';

/**
 * 节点处理函数类型
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文（可选）
 * @returns 执行结果
 */
export type NodeHandler = (thread: Thread, node: Node, context?: any) => Promise<any>;

// 导入各个节点处理函数
import { startHandler } from './start-handler.js';
import { endHandler } from './end-handler.js';
import { variableHandler } from './variable-handler.js';
import { codeHandler } from './code-handler.js';
import { forkHandler } from './fork-handler.js';
import { joinHandler } from './join-handler.js';
import { routeHandler } from './route-handler.js';
import { loopStartHandler } from './loop-start-handler.js';
import { loopEndHandler } from './loop-end-handler.js';
import { userInteractionHandler } from './user-interaction-handler.js';
import { contextProcessorHandler } from './context-processor-handler.js';
import { llmHandler } from './llm-handler.js';
import { addToolHandler } from './add-tool-handler.js';
import { startFromTriggerHandler } from './start-from-trigger-handler.js';
import { continueFromTriggerHandler } from './continue-from-trigger-handler.js';

/**
 * 节点处理函数映射
 *
 * 注意：节点类型是固定的（NodeType枚举），不需要注册机制
 * 处理器在模块加载时静态映射，不支持运行时扩展
 */
export const nodeHandlers: Record<NodeType, NodeHandler> = {
  ['START']: startHandler,
  ['END']: endHandler,
  ['VARIABLE']: variableHandler,
  ['SCRIPT']: scriptHandler,
  ['FORK']: forkHandler,
  ['JOIN']: joinHandler,
  ['ROUTE']: routeHandler,
  ['LOOP_START']: loopStartHandler,
  ['LOOP_END']: loopEndHandler,
  ['USER_INTERACTION']: userInteractionHandler,
  ['CONTEXT_PROCESSOR']: contextProcessorHandler,
  ['LLM']: llmHandler,
  ['ADD_TOOL']: addToolHandler,
  ['START_FROM_TRIGGER']: startFromTriggerHandler,
  ['CONTINUE_FROM_TRIGGER']: continueFromTriggerHandler
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
export { startHandler } from './start-handler.js';
export { endHandler } from './end-handler.js';
export { variableHandler } from './variable-handler.js';
export { codeHandler } from './code-handler.js';
export { forkHandler } from './fork-handler.js';
export { joinHandler } from './join-handler.js';
export { routeHandler } from './route-handler.js';
export { loopStartHandler } from './loop-start-handler.js';
export { loopEndHandler } from './loop-end-handler.js';
export { userInteractionHandler } from './user-interaction-handler.js';
export { contextProcessorHandler } from './context-processor-handler.js';
export { llmHandler } from './llm-handler.js';
export { addToolHandler } from './add-tool-handler.js';
export { startFromTriggerHandler } from './start-from-trigger-handler.js';
export { continueFromTriggerHandler } from './continue-from-trigger-handler.js';
