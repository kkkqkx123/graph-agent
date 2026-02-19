/**
 * sdk模块的全局工具函数
 * 这里动态导入的实例统一由 SDK 模块的主索引文件初始化
 */

// Token编码工具
export { encodeText, encodeObject, resetEncoder } from './token-encoder.js';

// 日志工具
export { logger } from './logger.js';
export {
  ContextualLogger,
  createContextualLogger
} from './contextual-logger.js';

// 元数据工具
export { getMetadata, hasMetadata, mergeMetadata } from './metadata-utils.js';

// ID工具
export {
  generateId,
  isValidId,
  validateId,
  generateSubgraphNamespace,
  generateNamespacedNodeId,
  generateNamespacedEdgeId,
  extractOriginalId,
  isNamespacedId
} from './id-utils.js';

// 版本工具
export {
  initialVersion,
  parseVersion,
  nextMajorVersion,
  nextMinorVersion,
  nextPatchVersion,
  compareVersion,
  autoIncrementVersion,
  parseFullVersion
} from './version-utils.js';