import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { StateValue } from '../graph/state';

/**
 * 状态管理事件基类
 */
export abstract class StateManagementEvent {
  /** 事件ID */
  readonly eventId: string;
  /** 图ID */
  readonly graphId: ID;
  /** 事件时间 */
  readonly timestamp: Timestamp;
  /** 事件版本 */
  readonly version: Version;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;

  constructor(
    graphId: ID,
    metadata: Record<string, any> = {}
  ) {
    this.eventId = this.generateEventId();
    this.graphId = graphId;
    this.timestamp = Timestamp.now();
    this.version = Version.initial();
    this.metadata = metadata;
  }

  /**
   * 获取事件类型
   */
  abstract getEventType(): string;

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 序列化事件
   */
  serialize(): string {
    return JSON.stringify({
      eventId: this.eventId,
      eventType: this.getEventType(),
      graphId: this.graphId,
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      metadata: this.metadata,
      data: this.getEventData()
    });
  }

  /**
   * 获取事件数据
   */
  protected abstract getEventData(): Record<string, any>;
}

/**
 * 状态设置事件
 */
export class StateSetEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly key: string,
    readonly value: StateValue,
    readonly oldValue?: StateValue,
    readonly nodeId?: ID,
    readonly namespace?: string,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateSet';
  }

  protected getEventData(): Record<string, any> {
    return {
      key: this.key,
      value: this.value,
      oldValue: this.oldValue,
      nodeId: this.nodeId,
      namespace: this.namespace
    };
  }
}

/**
 * 状态删除事件
 */
export class StateDeletedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly key: string,
    readonly deletedValue: StateValue,
    readonly nodeId?: ID,
    readonly namespace?: string,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateDeleted';
  }

  protected getEventData(): Record<string, any> {
    return {
      key: this.key,
      deletedValue: this.deletedValue,
      nodeId: this.nodeId,
      namespace: this.namespace
    };
  }
}

/**
 * 状态批量设置事件
 */
export class StateBatchSetEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly entries: Array<{
      key: string;
      value: StateValue;
      oldValue?: StateValue;
      nodeId?: ID;
      namespace?: string;
    }>,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateBatchSet';
  }

  protected getEventData(): Record<string, any> {
    return {
      entries: this.entries
    };
  }
}

/**
 * 状态批量删除事件
 */
export class StateBatchDeletedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly entries: Array<{
      key: string;
      deletedValue: StateValue;
      nodeId?: ID;
      namespace?: string;
    }>,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateBatchDeleted';
  }

  protected getEventData(): Record<string, any> {
    return {
      entries: this.entries
    };
  }
}

/**
 * 状态快照创建事件
 */
export class StateSnapshotCreatedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly snapshotId: string,
    readonly stateCount: number,
    readonly size: number,
    readonly description?: string,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateSnapshotCreated';
  }

  protected getEventData(): Record<string, any> {
    return {
      snapshotId: this.snapshotId,
      description: this.description,
      stateCount: this.stateCount,
      size: this.size
    };
  }
}

/**
 * 状态快照恢复事件
 */
export class StateSnapshotRestoredEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly snapshotId: string,
    readonly restoredStateCount: number,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateSnapshotRestored';
  }

  protected getEventData(): Record<string, any> {
    return {
      snapshotId: this.snapshotId,
      restoredStateCount: this.restoredStateCount
    };
  }
}

/**
 * 状态快照删除事件
 */
export class StateSnapshotDeletedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly snapshotId: string,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateSnapshotDeleted';
  }

  protected getEventData(): Record<string, any> {
    return {
      snapshotId: this.snapshotId
    };
  }
}

/**
 * 状态清理事件
 */
export class StateClearedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly clearedCount: number,
    readonly scope: 'graph' | 'node' | 'namespace',
    readonly nodeId?: ID,
    readonly namespace?: string,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateCleared';
  }

  protected getEventData(): Record<string, any> {
    return {
      clearedCount: this.clearedCount,
      scope: this.scope,
      nodeId: this.nodeId,
      namespace: this.namespace
    };
  }
}

/**
 * 状态导出事件
 */
export class StateExportedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly exportId: string,
    readonly format: string,
    readonly stateCount: number,
    readonly size: number,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateExported';
  }

  protected getEventData(): Record<string, any> {
    return {
      exportId: this.exportId,
      format: this.format,
      stateCount: this.stateCount,
      size: this.size
    };
  }
}

/**
 * 状态导入事件
 */
export class StateImportedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly importId: string,
    readonly format: string,
    readonly importedStateCount: number,
    readonly overwrittenCount: number,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateImported';
  }

  protected getEventData(): Record<string, any> {
    return {
      importId: this.importId,
      format: this.format,
      importedStateCount: this.importedStateCount,
      overwrittenCount: this.overwrittenCount
    };
  }
}

/**
 * 状态验证事件
 */
export class StateValidatedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly validationId: string,
    readonly validationResult: {
      valid: boolean;
      errors: Array<{
        key: string;
        message: string;
        severity: string;
      }>;
      warnings: Array<{
        key: string;
        message: string;
        severity: string;
      }>;
    },
    readonly validatedStateCount: number,
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateValidated';
  }

  protected getEventData(): Record<string, any> {
    return {
      validationId: this.validationId,
      validationResult: this.validationResult,
      validatedStateCount: this.validatedStateCount
    };
  }
}

/**
 * 状态修复事件
 */
export class StateRepairedEvent extends StateManagementEvent {
  constructor(
    graphId: ID,
    readonly repairId: string,
    readonly repairResult: {
      repairedCount: number;
      failedCount: number;
      errors: Array<{
        key: string;
        message: string;
      }>;
    },
    metadata: Record<string, any> = {}
  ) {
    super(graphId, metadata);
  }

  getEventType(): string {
    return 'StateRepaired';
  }

  protected getEventData(): Record<string, any> {
    return {
      repairId: this.repairId,
      repairResult: this.repairResult
    };
  }
}