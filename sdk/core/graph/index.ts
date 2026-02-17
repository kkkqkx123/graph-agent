/**
 * 图模块统一导出
 */

// 核心类
export { GraphBuilder } from './graph-builder.js';
export { GraphNavigator } from './graph-navigator.js';
export { processWorkflow } from './workflow-processor.js';
export type { ProcessOptions } from './workflow-processor.js';

// 图分析工具函数
export { analyzeGraph, collectForkJoinPairs } from './utils/graph-analyzer.js';

// 类型导出
export type {
  NavigationResult,
  RoutingDecision,
} from './graph-navigator.js';
