/**
 * 无状态工具类
 * 直接导出函数而非对象
 * 由工具类内部使用的工具类不导出
 */
export { conditionEvaluator } from "./condition-evaluator";

// 通用工具函数
export { generateId, isValidId } from "./id-utils";
export { now, timestampFromDate, timestampToDate, timestampToISOString } from "./timestamp-utils";
export { initialVersion, parseVersion, nextMajorVersion, nextMinorVersion, nextPatchVersion, compareVersion } from "./version-utils";
export { emptyMetadata, getMetadata, setMetadata, deleteMetadata, hasMetadata, mergeMetadata } from "./metadata-utils";
