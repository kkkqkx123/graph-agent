/**
 * 图模块统一导出
 */

// 核心类
export { GraphData } from './graph-data';
export { GraphBuilder } from './graph-builder';
export { GraphNavigator } from './graph-navigator';

// 图分析工具函数
export { analyzeGraph, collectForkJoinPairs } from './utils/graph-analyzer';

// 类型导出
export type {
  NavigationResult,
  RoutingDecision,
} from './graph-navigator';