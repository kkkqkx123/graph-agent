/**
 * 图模块统一导出
 */

// 核心类
export { GraphBuilder } from './graph-builder';
export { GraphNavigator } from './graph-navigator';
export { processWorkflow } from './workflow-processor';
export type { ProcessOptions } from './workflow-processor';

// 图分析工具函数
export { analyzeGraph, collectForkJoinPairs } from './utils/graph-analyzer';

// 类型导出
export type {
  NavigationResult,
  RoutingDecision,
} from './graph-navigator';
