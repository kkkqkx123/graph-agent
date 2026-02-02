/**
 * 节点验证函数模块
 * 提供所有节点类型的验证函数
 */

import { NodeType } from '../../../types/node';
import type { Node } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

export { validateForkNode } from './fork-validator';
export { validateJoinNode } from './join-validator';
export { validateLoopStartNode } from './loop-start-validator';
export { validateLoopEndNode } from './loop-end-validator';
export { validateStartNode } from './start-validator';
export { validateEndNode } from './end-validator';
export { validateCodeNode } from './code-validator';
export { validateContextProcessorNode } from './context-processor-validator';
export { validateRouteNode } from './route-validator';
export { validateVariableNode } from './variable-validator';
export { validateLLMNode } from './llm-validator';
export { validateUserInteractionNode } from './user-interaction-validator';
export { validateSubgraphNode } from './subgraph-validator';
export { validateStartFromTriggerNode } from './start-from-trigger-validator';
export { validateContinueFromTriggerNode } from './continue-from-trigger-validator';

/**
 * 根据节点类型验证节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateNodeByType(node: Node): void {
  switch (node.type) {
    case NodeType.START:
      const { validateStartNode } = require('./start-validator');
      validateStartNode(node);
      break;
    case NodeType.END:
      const { validateEndNode } = require('./end-validator');
      validateEndNode(node);
      break;
    case NodeType.FORK:
      const { validateForkNode } = require('./fork-validator');
      validateForkNode(node);
      break;
    case NodeType.JOIN:
      const { validateJoinNode } = require('./join-validator');
      validateJoinNode(node);
      break;
    case NodeType.LOOP_START:
      const { validateLoopStartNode } = require('./loop-start-validator');
      validateLoopStartNode(node);
      break;
    case NodeType.LOOP_END:
      const { validateLoopEndNode } = require('./loop-end-validator');
      validateLoopEndNode(node);
      break;
    case NodeType.CODE:
      const { validateCodeNode } = require('./code-validator');
      validateCodeNode(node);
      break;
    case NodeType.CONTEXT_PROCESSOR:
      const { validateContextProcessorNode } = require('./context-processor-validator');
      validateContextProcessorNode(node);
      break;
    case NodeType.ROUTE:
      const { validateRouteNode } = require('./route-validator');
      validateRouteNode(node);
      break;
    case NodeType.VARIABLE:
      const { validateVariableNode } = require('./variable-validator');
      validateVariableNode(node);
      break;
    case NodeType.LLM:
      const { validateLLMNode } = require('./llm-validator');
      validateLLMNode(node);
      break;
    case NodeType.USER_INTERACTION:
      const { validateUserInteractionNode } = require('./user-interaction-validator');
      validateUserInteractionNode(node);
      break;
    case NodeType.SUBGRAPH:
      const { validateSubgraphNode } = require('./subgraph-validator');
      validateSubgraphNode(node);
      break;
    case NodeType.START_FROM_TRIGGER:
      const { validateStartFromTriggerNode } = require('./start-from-trigger-validator');
      validateStartFromTriggerNode(node);
      break;
    case NodeType.CONTINUE_FROM_TRIGGER:
      const { validateContinueFromTriggerNode } = require('./continue-from-trigger-validator');
      validateContinueFromTriggerNode(node);
      break;
    default:
      throw new ValidationError(`Unknown node type: ${node.type}`, `node.${node.id}`);
  }
}