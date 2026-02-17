/**
 * 无状态工具类
 * 直接导出函数而非对象
 */

// 通用工具函数
export { generateId, isValidId, validateId } from './id-utils.js';
export { generateSubgraphNamespace, generateNamespacedNodeId, generateNamespacedEdgeId } from './id-utils.js';
export { now, timestampFromDate, timestampToDate, timestampToISOString, nowWithTimezone, diffTimestamp, formatDuration } from './timestamp-utils.js';
export { initialVersion } from './version-utils.js';
export { emptyMetadata, getMetadata, setMetadata, deleteMetadata, hasMetadata, mergeMetadata } from './metadata-utils.js';
export { ok, err, tryCatch, tryCatchAsync, tryCatchAsyncWithSignal, all, any } from './result-utils.js';

export * from './signal/index.js';