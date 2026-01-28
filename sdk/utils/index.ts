/**
 * 无状态工具类
 * 直接导出函数而非对象
 */

// 通用工具函数
export { generateId, isValidId, validateId } from "./id-utils";
export { now, timestampFromDate, timestampToDate, timestampToISOString, nowWithTimezone, diffTimestamp, formatDuration } from "./timestamp-utils";
export { initialVersion, parseVersion, nextMajorVersion, nextMinorVersion, nextPatchVersion, compareVersion, autoIncrementVersion, parseFullVersion } from "./version-utils";
export { emptyMetadata, getMetadata, setMetadata, deleteMetadata, hasMetadata, mergeMetadata } from "./metadata-utils";
