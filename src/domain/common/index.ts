/**
 * 通用领域模块入口
 *
 * 导出所有通用领域相关的类型、接口和类
 */

// 值对象
export { ID } from './value-objects/id';
export { UserId } from './value-objects/user-id';
export { Timestamp } from './value-objects/timestamp';
export { Version } from './value-objects/version';
export { ValueObject } from './value-objects/value-object';

// 基础类
export { Entity } from './base/entity';

// 仓储接口
export { Repository } from './repositories/repository';
export type { IQueryOptions as QueryOptions } from './repositories/repository';

// 类型定义
export * from './types';

// 工具类（技术实现已迁移到 infrastructure 层）
// 如需使用 EventEmitter，请从 infrastructure/common/utils 导入

// 值对象属性接口
export type { TimestampProps } from './value-objects/timestamp';
export type { VersionProps } from './value-objects/version';
