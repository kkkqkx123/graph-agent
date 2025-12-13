/**
 * 状态类型定义
 */

import { EntityId, Entity, DomainEvent } from './common';

/**
 * 状态类型
 */
export enum StateType {
  WORKFLOW = 'workflow',
  SESSION = 'session',
  GLOBAL = 'global'
}

/**
 * 状态实体
 */
export interface IState extends Entity {
  type: StateType;
  ownerId: EntityId;
  data: Record<string, any>;
  version: number;
}

/**
 * 状态事件
 */
export interface StateEvent extends DomainEvent {
  stateId: EntityId;
  type: StateType;
}

/**
 * 状态更新事件
 */
export interface StateUpdatedEvent extends StateEvent {
  changes: Record<string, any>;
  oldVersion: number;
  newVersion: number;
}