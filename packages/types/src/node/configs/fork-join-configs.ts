/**
 * 分叉/合并节点配置类型定义
 */

import type { ID } from '../../common';

/**
 * 分叉路径配置
 * 每个分叉路径包含路径ID和对应的子节点ID
 */
export interface ForkPath {
  /**
   * 分叉路径ID
   * 每个路径ID在工作流定义内部唯一
   * 图构建阶段会转换为全局唯一ID
   */
  pathId: ID;
  /** 子节点ID，该路径的起始节点 */
  childNodeId: string;
}

/**
 * 分叉节点配置
 */
export interface ForkNodeConfig {
  /** 分叉路径数组，每个路径包含pathId和childNodeId */
  forkPaths: ForkPath[];
  /** 分叉策略(串行、并行) */
  forkStrategy: 'serial' | 'parallel';
}

/**
 * 连接节点配置
 *
 * 说明：
 * - 子线程ID由运行时动态确定，在FORK节点执行时生成并存储在执行上下文中，
 *   JOIN节点执行时从执行上下文读取，不在节点配置中定义。
 * - timeout 表示等待子线程完成的最长时间（秒）。
 *   当 timeout = 0 时表示不设置超时，一直等待直到条件满足；
 *   当 timeout > 0 时表示最多等待该秒数，超时则抛出 TimeoutError。
 * - forkPathIds 必须与配对的FORK节点完全一致（包括顺序）
 * - mainPathId 指定主线程路径，必须是forkPathIds中的一个值
 */
export interface JoinNodeConfig {
  /**
   * 分叉路径ID数组，必须与配对的FORK节点完全一致
   */
  forkPathIds: ID[];
  /** 连接策略(ALL_COMPLETED、ANY_COMPLETED、ALL_FAILED、ANY_FAILED、SUCCESS_COUNT_THRESHOLD) */
  joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';
  /** 成功数量阈值（当joinStrategy为SUCCESS_COUNT_THRESHOLD时使用） */
  threshold?: number;
  /** 等待超时时间（秒）。0表示不超时，始终等待；>0表示最多等待的秒数。默认0（无超时） */
  timeout?: number;
  /** 主线程路径ID，必须是forkPathIds中的一个值（必填） */
  mainPathId: ID;
}