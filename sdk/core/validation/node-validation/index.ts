/**
 * 节点验证函数模块
 * 提供所有节点类型的验证函数
 * 
 * subgraph节点在执行阶段不存在，故不需要任何处理
 */

import { NodeType } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

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
 * @returns 验证结果
 */
export function validateNodeByType(node: Node): Result<Node, ConfigurationValidationError[]> {
  switch (node.type) {
    case NodeType.START:
      const { validateStartNode } = require('./start-validator');
      return validateStartNode(node);
    case NodeType.END:
      const { validateEndNode } = require('./end-validator');
      return validateEndNode(node);
    case NodeType.FORK:
      const { validateForkNode } = require('./fork-validator');
      return validateForkNode(node);
    case NodeType.JOIN:
      const { validateJoinNode } = require('./join-validator');
      return validateJoinNode(node);
    case NodeType.LOOP_START:
      const { validateLoopStartNode } = require('./loop-start-validator');
      return validateLoopStartNode(node);
    case NodeType.LOOP_END:
      const { validateLoopEndNode } = require('./loop-end-validator');
      return validateLoopEndNode(node);
    case NodeType.CODE:
      const { validateCodeNode } = require('./code-validator');
      return validateCodeNode(node);
    case NodeType.CONTEXT_PROCESSOR:
      const { validateContextProcessorNode } = require('./context-processor-validator');
      return validateContextProcessorNode(node);
    case NodeType.ROUTE:
      const { validateRouteNode } = require('./route-validator');
      return validateRouteNode(node);
    case NodeType.VARIABLE:
      const { validateVariableNode } = require('./variable-validator');
      return validateVariableNode(node);
    case NodeType.LLM:
      const { validateLLMNode } = require('./llm-validator');
      return validateLLMNode(node);
    case NodeType.USER_INTERACTION:
      const { validateUserInteractionNode } = require('./user-interaction-validator');
      return validateUserInteractionNode(node);
    case NodeType.SUBGRAPH:
      const { validateSubgraphNode } = require('./subgraph-validator');
      return validateSubgraphNode(node);
    case NodeType.START_FROM_TRIGGER:
      const { validateStartFromTriggerNode } = require('./start-from-trigger-validator');
      return validateStartFromTriggerNode(node);
    case NodeType.CONTINUE_FROM_TRIGGER:
      const { validateContinueFromTriggerNode } = require('./continue-from-trigger-validator');
      return validateContinueFromTriggerNode(node);
    default:
      return err([new ConfigurationValidationError(`Unknown node type: ${node.type}`, {
        configType: 'node',
        configPath: `node.${node.id}`
      })]);
  }
}