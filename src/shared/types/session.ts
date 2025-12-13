/**
 * 会话类型定义
 */

import { EntityId, AggregateRoot, DomainEvent } from './common';

/**
 * 会话状态
 */
export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated'
}

/**
 * 会话类型
 */
export enum SessionType {
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  WEBHOOK = 'webhook'
}

/**
 * 会话实体
 */
export interface ISession extends AggregateRoot {
  userId?: string;
  type: SessionType;
  status: SessionStatus;
  metadata: Record<string, any>;
  expiresAt?: Date;
  lastActivityAt: Date;
}

/**
 * 会话事件
 */
export interface SessionEvent extends DomainEvent {
  sessionId: EntityId;
}

/**
 * 会话创建事件
 */
export interface SessionCreatedEvent extends SessionEvent {
  userId?: string;
  type: SessionType;
  metadata: Record<string, any>;
}

/**
 * 会话更新事件
 */
export interface SessionUpdatedEvent extends SessionEvent {
  changes: Record<string, any>;
}

/**
 * 会话终止事件
 */
export interface SessionTerminatedEvent extends SessionEvent {
  reason: string;
}