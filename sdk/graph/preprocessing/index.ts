/**
 * Graph Preprocessing模块导出
 * 提供图构建、预处理和导航功能
 */

export { GraphBuilder } from './graph-builder.js';
export { GraphNavigator } from './graph-navigator.js';
export { processWorkflow } from './workflow-processor.js';
export type { ProcessOptions } from './workflow-processor.js';

// 导出图工具
export {
  analyzeGraph,
  collectForkJoinPairs
} from './utils/graph-analyzer.js';

export {
  detectCycles
} from './utils/graph-cycle-detector.js';

export {
  analyzeReachability
} from './utils/graph-reachability-analyzer.js';

export {
  getReachableNodes,
  getNodesReachingTo
} from './utils/graph-traversal.js';

export {
  dfs,
  bfs
} from './utils/graph-traversal.js';

export {
  topologicalSort
} from './utils/graph-topological-sorter.js';