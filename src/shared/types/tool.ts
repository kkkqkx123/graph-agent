/**
 * 工具类型定义
 */

import { EntityId, Entity, DomainEvent } from './common';

/**
 * 工具类型
 */
export enum ToolType {
  BUILTIN = 'builtin',
  NATIVE = 'native',
  REST = 'rest',
  MCP = 'mcp'
}

/**
 * 工具状态
 */
export enum ToolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

/**
 * 工具实体
 */
export interface ITool extends Entity {
  name: string;
  type: ToolType;
  status: ToolStatus;
  description: string;
  config: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * 工具执行参数
 */
export interface ToolExecutionParams {
  toolId: EntityId;
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * 工具事件
 */
export interface ToolEvent extends DomainEvent {
  toolId: EntityId;
}

/**
 * 工具执行事件
 */
export interface ToolExecutedEvent extends ToolEvent {
  parameters: Record<string, any>;
  result: ToolExecutionResult;
}