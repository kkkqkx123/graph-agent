/**
 * 工作流类型定义
 */

import { EntityId, Entity, AggregateRoot, DomainEvent } from './common';

/**
 * 工作流状态
 */
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 节点类型
 */
export enum NodeType {
  START = 'start',
  END = 'end',
  TASK = 'task',
  DECISION = 'decision',
  PARALLEL = 'parallel',
  MERGE = 'merge',
  SUBWORKFLOW = 'subworkflow'
}

/**
 * 工作流实体
 */
export interface IWorkflow extends Entity {
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  definition: IWorkflowDefinition;
  metadata: Record<string, any>;
}

/**
 * 图定义接口
 */
export interface IWorkflowDefinition {
  nodes: INodeDefinition[];
  edges: IEdgeDefinition[];
}

/**
 * 节点定义接口
 */
export interface INodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
  position?: {
    x: number;
    y: number;
  };
}

/**
 * 边定义接口
 */
export interface IEdgeDefinition {
  id: string;
  source: string;
  target: string;
  condition?: string;
  config?: Record<string, any>;
}

/**
 * 工作流执行实例
 */
export interface IWorkflowExecution extends AggregateRoot {
  workflowId: EntityId;
  status: WorkflowExecutionStatus;
  context: Record<string, any>;
  currentNodeId?: string;
  startTime: Date;
  endTime?: Date;
  error?: Error;
}

/**
 * 工作流执行状态
 */
export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 节点执行实例
 */
export interface INodeExecution extends Entity {
  workflowExecutionId: EntityId;
  nodeId: string;
  status: NodeExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  error?: Error;
}

/**
 * 节点执行状态
 */
export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * 工作流事件
 */
export interface WorkflowEvent extends DomainEvent {
  workflowId: EntityId;
  executionId?: EntityId;
}

/**
 * 工作流启动事件
 */
export interface WorkflowStartedEvent extends WorkflowEvent {
  context: Record<string, any>;
}

/**
 * 工作流完成事件
 */
export interface WorkflowCompletedEvent extends WorkflowEvent {
  result: Record<string, any>;
}

/**
 * 工作流失败事件
 */
export interface WorkflowFailedEvent extends WorkflowEvent {
  error: Error;
}

/**
 * 节点启动事件
 */
export interface NodeStartedEvent extends WorkflowEvent {
  nodeId: string;
  input: Record<string, any>;
}

/**
 * 节点完成事件
 */
export interface NodeCompletedEvent extends WorkflowEvent {
  nodeId: string;
  output: Record<string, any>;
}

/**
 * 节点失败事件
 */
export interface NodeFailedEvent extends WorkflowEvent {
  nodeId: string;
  error: Error;
}