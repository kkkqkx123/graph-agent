/**
 * 通用领域模块入口
 *
 * 导出所有通用领域相关的类型、接口和类
 */

// 值对象
export { ID } from './value-objects/id';
export { UserId } from './value-objects/user-id';
export { SessionId } from './value-objects/session-id';
export { ThreadId } from './value-objects/thread-id';
export { WorkflowId } from './value-objects/workflow-id';
export { NodeId } from './value-objects/node-id';
export { EdgeId } from './value-objects/edge-id';
export { Timestamp } from './value-objects/timestamp';
export { Version } from './value-objects/version';
export { ValueObject } from './value-objects/value-object';

// 基础类
export { Entity } from './base/entity';

// 错误处理已简化，直接使用标准 Error 类
// 如需专门的错误处理，请在各自的模块中定义

// 事件类
export { DomainEvent } from './events/domain-event';
// EventDispatcher 已迁移到 infrastructure 层
// 如需使用，请从 infrastructure/common/event-dispatchers 导入

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

// 事件属性接口
export type { DomainEventProps } from './events/domain-event';
