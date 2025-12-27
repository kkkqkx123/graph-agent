import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';
import { NodeId } from '../../../workflow/value-objects/node-id';
import { PromptContext } from '../../../workflow/value-objects/prompt-context';
import { NodeExecutionSnapshot } from '../../value-objects/node-execution';

/**
 * Fork选项接口
 */
export interface ForkOptions {
  readonly contextRetention: 'full' | 'partial' | 'minimal';
  readonly nodeStateHandling: 'copy' | 'reset' | 'inherit';
  readonly includeHistory: boolean;
  readonly includeMetadata: boolean;
  readonly customSettings?: Record<string, unknown>;
}

/**
 * Fork上下文接口
 */
export interface ForkContext {
  readonly forkId: ID;
  readonly parentThreadId: ID;
  readonly forkPoint: NodeId;
  readonly timestamp: Timestamp;
  
  // 上下文快照
  readonly variableSnapshot: Map<string, unknown>;
  readonly nodeStateSnapshot: Map<string, NodeExecutionSnapshot>;
  readonly promptContextSnapshot: PromptContext;
  
  // Fork配置
  readonly options: ForkOptions;
}

/**
 * 创建Fork上下文
 * @param parentThreadId 父线程ID
 * @param forkPoint Fork点
 * @param variables 变量快照
 * @param nodeStates 节点状态快照
 * @param promptContext 提示词上下文快照
 * @param options Fork选项
 * @returns Fork上下文
 */
export function createForkContext(
  parentThreadId: ID,
  forkPoint: NodeId,
  variables: Map<string, unknown>,
  nodeStates: Map<string, NodeExecutionSnapshot>,
  promptContext: PromptContext,
  options: ForkOptions
): ForkContext {
  return {
    forkId: ID.generate(),
    parentThreadId,
    forkPoint,
    timestamp: Timestamp.now(),
    variableSnapshot: new Map(variables),
    nodeStateSnapshot: new Map(nodeStates),
    promptContextSnapshot: promptContext,
    options
  };
}

/**
 * 默认Fork选项
 */
export const DEFAULT_FORK_OPTIONS: ForkOptions = {
  contextRetention: 'partial',
  nodeStateHandling: 'inherit',
  includeHistory: true,
  includeMetadata: true
};

/**
 * 创建完整上下文保留的Fork选项
 */
export function createFullContextForkOptions(): ForkOptions {
  return {
    ...DEFAULT_FORK_OPTIONS,
    contextRetention: 'full',
    nodeStateHandling: 'copy'
  };
}

/**
 * 创建最小上下文保留的Fork选项
 */
export function createMinimalContextForkOptions(): ForkOptions {
  return {
    ...DEFAULT_FORK_OPTIONS,
    contextRetention: 'minimal',
    nodeStateHandling: 'reset',
    includeHistory: false,
    includeMetadata: false
  };
}