/**
 * 节点验证函数模块
 * 提供所有节点类型的验证函数
 *
 * subgraph节点在执行阶段不存在，故不需要任何处理
 */

import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { err } from '@modular-agent/common-utils';

import { validateStartNode } from './start-validator.js';
import { validateEndNode } from './end-validator.js';
import { validateForkNode } from './fork-validator.js';
import { validateJoinNode } from './join-validator.js';
import { validateLoopStartNode } from './loop-start-validator.js';
import { validateLoopEndNode } from './loop-end-validator.js';
import { validateScriptNode } from './script-validator.js';
import { validateContextProcessorNode } from './context-processor-validator.js';
import { validateRouteNode } from './route-validator.js';
import { validateVariableNode } from './variable-validator.js';
import { validateLLMNode } from './llm-validator.js';
import { validateAddToolNode } from './add-tool-validator.js';
import { validateUserInteractionNode } from './user-interaction-validator.js';
import { validateSubgraphNode } from './subgraph-validator.js';
import { validateStartFromTriggerNode } from './start-from-trigger-validator.js';
import { validateContinueFromTriggerNode } from './continue-from-trigger-validator.js';

export { validateForkNode } from './fork-validator.js';
export { validateJoinNode } from './join-validator.js';
export { validateLoopStartNode } from './loop-start-validator.js';
export { validateLoopEndNode } from './loop-end-validator.js';
export { validateStartNode } from './start-validator.js';
export { validateEndNode } from './end-validator.js';
export { validateScriptNode } from './script-validator.js';
export { validateContextProcessorNode } from './context-processor-validator.js';
export { validateRouteNode } from './route-validator.js';
export { validateVariableNode } from './variable-validator.js';
export { validateLLMNode } from './llm-validator.js';
export { validateAddToolNode } from './add-tool-validator.js';
export { validateUserInteractionNode } from './user-interaction-validator.js';
export { validateSubgraphNode } from './subgraph-validator.js';
export { validateStartFromTriggerNode } from './start-from-trigger-validator.js';
export { validateContinueFromTriggerNode } from './continue-from-trigger-validator.js';

/**
 * 根据节点类型验证节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateNodeByType(node: Node): Result<Node, ConfigurationValidationError[]> {
  switch (node.type) {
    case 'START':
      return validateStartNode(node);
    case 'END':
      return validateEndNode(node);
    case 'FORK':
      return validateForkNode(node);
    case 'JOIN':
      return validateJoinNode(node);
    case 'LOOP_START':
      return validateLoopStartNode(node);
    case 'LOOP_END':
      return validateLoopEndNode(node);
    case 'SCRIPT':
      return validateScriptNode(node);
    case 'CONTEXT_PROCESSOR':
      return validateContextProcessorNode(node);
    case 'ROUTE':
      return validateRouteNode(node);
    case 'VARIABLE':
      return validateVariableNode(node);
    case 'LLM':
      return validateLLMNode(node);
    case 'ADD_TOOL':
      return validateAddToolNode(node);
    case 'USER_INTERACTION':
      return validateUserInteractionNode(node);
    case 'SUBGRAPH':
      return validateSubgraphNode(node);
    case 'START_FROM_TRIGGER':
      return validateStartFromTriggerNode(node);
    case 'CONTINUE_FROM_TRIGGER':
      return validateContinueFromTriggerNode(node);
    default:
      return err([new ConfigurationValidationError(`Unknown node type: ${node.type}`, {
        configType: 'node',
        configPath: `node.${node.id}`
      })]);
  }
}
