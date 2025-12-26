import { NodeId } from '../value-objects/node-id';
import { NodeExecutionState } from './node-execution-state';
import { PromptContext } from '../value-objects/prompt-context';

/**
 * 状态转换上下文接口
 *
 * 表示状态在节点之间传递时的上下文信息
 */
export interface StateTransferContext {
  /** 源节点ID */
  sourceNodeId: NodeId;
  /** 目标节点ID */
  targetNodeId: NodeId;
  /** 源节点状态 */
  sourceState: NodeExecutionState;
  /** 执行变量 */
  variables: Map<string, unknown>;
  /** 提示词上下文 */
  promptContext: PromptContext;
  /** 边属性 */
  edgeProperties?: Record<string, unknown>;
}

/**
 * 创建状态转换上下文
 * @param sourceNodeId 源节点ID
 * @param targetNodeId 目标节点ID
 * @param sourceState 源节点状态
 * @param variables 执行变量
 * @param promptContext 提示词上下文
 * @param edgeProperties 边属性
 * @returns 状态转换上下文
 */
export function createStateTransferContext(
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
  sourceState: NodeExecutionState,
  variables: Map<string, unknown>,
  promptContext: PromptContext,
  edgeProperties?: Record<string, unknown>
): StateTransferContext {
  return {
    sourceNodeId,
    targetNodeId,
    sourceState,
    variables,
    promptContext,
    edgeProperties
  };
}

/**
 * 从上下文中获取变量值
 * @param context 状态转换上下文
 * @param key 变量名
 * @returns 变量值
 */
export function getVariable(context: StateTransferContext, key: string): unknown | undefined {
  return context.variables.get(key);
}

/**
 * 设置变量值到上下文
 * @param context 状态转换上下文
 * @param key 变量名
 * @param value 变量值
 * @returns 新的上下文（不可变）
 */
export function setVariable(
  context: StateTransferContext,
  key: string,
  value: unknown
): StateTransferContext {
  const newVariables = new Map(context.variables);
  newVariables.set(key, value);
  return {
    ...context,
    variables: newVariables
  };
}