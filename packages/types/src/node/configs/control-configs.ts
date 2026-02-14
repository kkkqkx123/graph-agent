/**
 * 控制节点配置类型定义
 * 包含 START、END、ROUTE 节点配置
 */

import type { Condition } from '../../condition';

/**
 * 开始节点配置
 */
export interface StartNodeConfig {
  // 无配置，仅作为工作流开始标志
}

/**
 * 结束节点配置
 */
export interface EndNodeConfig {
  // 无配置，仅作为工作流结束标志
}

/**
 * 路由节点配置
 */
export interface RouteNodeConfig {
  /** 路由规则数组 */
  routes: Array<{
    /** 条件表达式 */
    condition: Condition;
    /** 目标节点ID */
    targetNodeId: string;
    /** 优先级 */
    priority?: number;
  }>;
  /** 默认目标节点ID */
  defaultTargetNodeId?: string;
}