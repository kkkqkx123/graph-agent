/**
 * 历史记录类型定义
 */

import { EntityId, Entity, DomainEvent } from './common';

/**
 * 历史记录类型
 */
export enum HistoryType {
  WORKFLOW = 'workflow',
  SESSION = 'session',
  LLM = 'llm',
  TOOL = 'tool',
  SYSTEM = 'system'
}

/**
 * 历史记录实体
 */
export interface IHistory extends Entity {
  type: HistoryType;
  ownerId: EntityId;
  event: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * 历史记录事件
 */
export interface HistoryEvent extends DomainEvent {
  historyId: EntityId;
  type: HistoryType;
}

/**
 * 历史记录创建事件
 */
export interface HistoryCreatedEvent extends HistoryEvent {
  ownerId: EntityId;
  event: string;
  data: Record<string, any>;
}