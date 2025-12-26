import { NodeId } from '../value-objects/node-id';
import { EdgeValueObject } from '../value-objects/edge-value-object';

/**
 * 路由决策接口
 *
 * 表示节点执行后的路由决策结果，包含下一个节点、满足条件的边等
 */
export interface RouteDecision {
  /** 下一个节点ID列表 */
  nextNodeIds: NodeId[];
  /** 满足条件的边 */
  satisfiedEdges: EdgeValueObject[];
  /** 未满足条件的边 */
  unsatisfiedEdges: EdgeValueObject[];
  /** 状态更新 */
  stateUpdates: Record<string, unknown>;
  /** 路由元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 创建路由决策
 * @param nextNodeIds 下一个节点ID列表
 * @param satisfiedEdges 满足条件的边
 * @param unsatisfiedEdges 未满足条件的边
 * @param stateUpdates 状态更新
 * @param metadata 路由元数据
 * @returns 路由决策
 */
export function createRouteDecision(
  nextNodeIds: NodeId[],
  satisfiedEdges: EdgeValueObject[],
  unsatisfiedEdges: EdgeValueObject[],
  stateUpdates: Record<string, unknown> = {},
  metadata?: Record<string, unknown>
): RouteDecision {
  return {
    nextNodeIds,
    satisfiedEdges,
    unsatisfiedEdges,
    stateUpdates,
    metadata
  };
}

/**
 * 创建空路由决策（没有下一个节点）
 * @param unsatisfiedEdges 未满足条件的边
 * @param metadata 路由元数据
 * @returns 路由决策
 */
export function createEmptyRouteDecision(
  unsatisfiedEdges: EdgeValueObject[] = [],
  metadata?: Record<string, unknown>
): RouteDecision {
  return {
    nextNodeIds: [],
    satisfiedEdges: [],
    unsatisfiedEdges,
    stateUpdates: {},
    metadata: { ...metadata, reason: 'no_satisfied_edges' }
  };
}

/**
 * 检查路由决策是否有下一个节点
 * @param decision 路由决策
 * @returns 是否有下一个节点
 */
export function hasNextNodes(decision: RouteDecision): boolean {
  return decision.nextNodeIds.length > 0;
}

/**
 * 检查路由决策是否成功
 * @param decision 路由决策
 * @returns 是否成功
 */
export function isSuccessfulRoute(decision: RouteDecision): boolean {
  return hasNextNodes(decision) || decision.metadata?.['reason'] === 'end_of_workflow';
}