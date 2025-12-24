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
export { AggregateRoot } from './base/aggregate-root';

// 错误类
export { DomainError } from './errors/domain-error';
export { RepositoryError } from './errors/repository-error';
export {
  ErrorHandlingStrategy,
  DomainErrorHandler,
  WorkflowErrorHandler,
  SessionErrorHandler,
  ErrorHandlerFactory,
  DefaultErrorHandler,
  type ErrorContext,
  type ErrorHandlingResult
} from './errors/error-handler';

// 事件类
export { DomainEvent } from './events/domain-event';
export { EventDispatcher } from './events/event-dispatcher';
export type { EventHandler } from './events/event-dispatcher';
export type { EventHandlerRegistration } from './events/event-dispatcher';

// 仓储接口
export { Repository } from './repositories/repository';
export type { IQueryOptions as QueryOptions } from './repositories/repository';
export type { PaginatedResult } from './repositories/repository';

// 值对象属性接口
export type { TimestampProps } from './value-objects/timestamp';
export type { VersionProps } from './value-objects/version';

// 事件属性接口
export type { DomainEventProps } from './events/domain-event';

// 验证器
export {
  DomainValidator,
  ValidationResult,
  ValidationResultBuilder,
  CompositeValidator,
  ConditionalValidator
} from './validators/domain-validator';
export { SessionValidator } from './validators/session-validator';
export { WorkflowValidator } from './validators/workflow-validator';