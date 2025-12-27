import { ID } from '../../../common/value-objects/id';
import { Timestamp } from '../../../common/value-objects/timestamp';
import { NodeId } from '../../../workflow/value-objects/node-id';
import { NodeExecutionSnapshot } from '../../value-objects/node-execution';

/**
 * Copy选项接口
 */
export interface CopyOptions {
  readonly copyScope: 'full' | 'partial';
  readonly includeExecutionHistory: boolean;
  readonly includeMetadata: boolean;
  readonly resetState: boolean;
  readonly customSettings?: Record<string, unknown>;
}

/**
 * Copy范围接口
 */
export interface CopyScope {
  readonly nodeIds: NodeId[];
  readonly includeVariables: boolean;
  readonly includeNodeStates: boolean;
  readonly includeContext: boolean;
}

/**
 * Copy上下文接口
 */
export interface CopyContext {
  readonly copyId: ID;
  readonly sourceThreadId: ID;
  readonly timestamp: Timestamp;
  
  // Copy配置
  readonly options: CopyOptions;
  
  // Copy范围
  readonly scope: CopyScope;
  
  // 关系映射
  readonly relationshipMapping: Map<ID, ID>;
}

/**
 * 创建Copy上下文
 * @param sourceThreadId 源线程ID
 * @param options Copy选项
 * @param scope Copy范围
 * @param relationshipMapping 关系映射
 * @returns Copy上下文
 */
export function createCopyContext(
  sourceThreadId: ID,
  options: CopyOptions,
  scope: CopyScope,
  relationshipMapping: Map<ID, ID>
): CopyContext {
  return {
    copyId: ID.generate(),
    sourceThreadId,
    timestamp: Timestamp.now(),
    options,
    scope,
    relationshipMapping: new Map(relationshipMapping)
  };
}

/**
 * 默认Copy选项
 */
export const DEFAULT_COPY_OPTIONS: CopyOptions = {
  copyScope: 'full',
  includeExecutionHistory: true,
  includeMetadata: true,
  resetState: false
};

/**
 * 创建完整Copy选项
 */
export function createFullCopyOptions(): CopyOptions {
  return {
    ...DEFAULT_COPY_OPTIONS,
    copyScope: 'full',
    resetState: false
  };
}

/**
 * 创建部分Copy选项
 */
export function createPartialCopyOptions(): CopyOptions {
  return {
    ...DEFAULT_COPY_OPTIONS,
    copyScope: 'partial',
    includeExecutionHistory: false,
    includeMetadata: false,
    resetState: true
  };
}

/**
 * 创建Copy范围
 * @param nodeIds 节点ID列表
 * @param includeVariables 是否包含变量
 * @param includeNodeStates 是否包含节点状态
 * @param includeContext 是否包含上下文
 * @returns Copy范围
 */
export function createCopyScope(
  nodeIds: NodeId[],
  includeVariables: boolean = true,
  includeNodeStates: boolean = true,
  includeContext: boolean = true
): CopyScope {
  return {
    nodeIds,
    includeVariables,
    includeNodeStates,
    includeContext
  };
}