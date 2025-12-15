/**
 * 图实体模块入口
 *
 * 导出所有图相关的实体
 */

// 基础实体
export * from './graph';
export * from './workflow-state';

// 节点实体
export * from './nodes';

// 边实体
export * from './edges';

// 类型定义，解决命名冲突
export type {
  ToolCall as LLMToolCall,
  Message,
  LLMResponse,
  TokenUsage
} from './nodes/specialized/llm-node';

export type {
  ToolNodeToolCall,
  ToolNodeExecutionResult
} from './nodes/specialized/tool-node';

export type {
  ConditionEvaluationResult as NodeConditionEvaluationResult
} from './nodes/specialized/condition-node';

export type {
  ConditionEvaluationResult as EdgeConditionEvaluationResult,
  ConditionExpression
} from './edges/specialized/conditional-edge';

export type {
  FlexibleConditionEvaluationResult,
  ComplexCondition,
  ConditionEvaluationContext
} from './edges/specialized/flexible-conditional-edge';