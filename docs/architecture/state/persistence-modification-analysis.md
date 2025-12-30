# 持久化实现修改分析

## 文档信息

- **文档版本**: 1.0.0
- **创建日期**: 2025-01-09
- **最后更新**: 2025-01-09
- **状态**: 草稿

## 1. 当前持久化实现分析

### 1.1 现有架构

```
src/infrastructure/persistence/
├── config/
│   └── database-config.ts
├── connections/
│   └── connection-manager.ts
├── models/
│   ├── checkpoint.model.ts
│   ├── history.model.ts
│   ├── session.model.ts
│   ├── thread.model.ts
│   └── workflow.model.ts
└── repositories/
    ├── base-repository.ts
    ├── checkpoint-repository.ts
    ├── history-repository.ts
    ├── session-repository.ts
    ├── thread-repository.ts
    └── workflow-repository.ts
```

### 1.2 BaseRepository分析

**优点**:
- 提供了统一的CRUD操作
- 支持分页查询
- 支持批量操作
- 使用TypeORM，功能完善

**特点**:
- 抽象基类，需要子类实现`getModelClass()`
- 提供`toDomain()`和`toModel()`方法用于实体转换
- 支持ID查询、条件查询、分页查询
- 支持批量保存、批量删除

**需要改进的地方**:
1. `toDomain()`和`toModel()`的默认实现过于简单
2. 缺少事务支持
3. 缺少批量持久化策略
4. 缺少缓存支持

### 1.3 CheckpointRepository分析

**当前实现**:
- 继承自`BaseRepository<Checkpoint, CheckpointModel, ID>`
- 实现了`ICheckpointRepository`接口
- 提供了丰富的查询方法（按线程、按类型、按时间、按标签等）
- 提供了统计方法

**问题**:
1. 使用的是基础的`Checkpoint`实体，而不是`ThreadCheckpoint`
2. `toDomain()`和`toModel()`方法中的字段映射不完整
3. 缺少对`ThreadCheckpoint`特有字段的支持（如`restoreCount`、`lastRestoredAt`、`expiresAt`等）
4. 缺少对检查点状态（`CheckpointStatus`）的支持

**需要修改的地方**:
1. 更新泛型参数为`ThreadCheckpoint`
2. 完善`toDomain()`和`toModel()`方法
3. 添加对`ThreadCheckpoint`特有字段的支持
4. 添加对检查点状态的支持

### 1.4 HistoryRepository分析

**当前实现**:
- 继承自`BaseRepository<History, HistoryModel, ID>`
- 实现了`IHistoryRepository`接口
- 提供了丰富的查询方法（按会话、按线程、按工作流、按类型等）
- 提供了统计和趋势分析方法
- 提供了搜索功能

**优点**:
- 功能完善
- 查询方法丰富
- 支持统计分析

**需要改进的地方**:
1. `toDomain()`和`toModel()`方法中的字段映射可以优化
2. 可以添加更多的历史类型支持
3. 可以添加历史记录的清理策略

## 2. 修改方案

### 2.1 新增Model

#### 2.1.1 StateModel

```typescript
// src/infrastructure/persistence/models/state.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('states')
@Index(['entityId', 'entityType'])
@Index(['type'])
@Index(['timestamp'])
export class StateModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['session', 'thread', 'execution', 'node', 'checkpoint', 'snapshot'],
    default: 'thread'
  })
  @Index()
  type!: string;

  @Column()
  @Index()
  entityId!: string;

  @Column()
  @Index()
  entityType!: string;

  @Column('jsonb')
  state!: any;

  @Column('jsonb', { nullable: true })
  context?: any;

  @Column({ type: 'bigint' })
  @Index()
  timestamp!: number;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDeleted!: boolean;
}
```

**设计说明**:
- 添加了索引以优化查询性能
- 使用`jsonb`类型存储状态和上下文，支持灵活的数据结构
- 使用`bigint`类型存储时间戳，支持高精度时间

#### 2.1.2 SnapshotModel

```typescript
// src/infrastructure/persistence/models/snapshot.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('snapshots')
@Index(['scope', 'targetId'])
@Index(['type'])
@Index(['createdAt'])
export class SnapshotModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ['automatic', 'manual', 'scheduled', 'error'],
    default: 'manual'
  })
  @Index()
  type!: string;

  @Column({
    type: 'enum',
    enum: ['session', 'thread', 'global'],
    default: 'thread'
  })
  @Index()
  scope!: string;

  @Column({ nullable: true })
  @Index()
  targetId?: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  stateData!: any;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'int', default: 0 })
  restoreCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestoredAt?: Date;
}
```

**设计说明**:
- 添加了复合索引以优化范围查询
- 使用`jsonb`类型存储状态数据
- 添加了`sizeBytes`字段用于存储数据大小
- 添加了`restoreCount`和`lastRestoredAt`字段用于跟踪恢复历史

#### 2.1.3 更新CheckpointModel

```typescript
// src/infrastructure/persistence/models/checkpoint.model.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('checkpoints')
@Index(['threadId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class CheckpointModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  threadId!: string;

  @Column({
    type: 'enum',
    enum: ['automatic', 'manual', 'error', 'milestone'],
    default: 'automatic'
  })
  @Index()
  type!: string;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'corrupted', 'archived'],
    default: 'active'
  })
  @Index()
  status!: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  stateData!: any;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @Column({ default: '1.0.0' })
  version!: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'int', default: 0 })
  restoreCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestoredAt?: Date;
}
```

**修改说明**:
- 添加了`status`字段用于跟踪检查点状态
- 添加了`expiresAt`字段用于支持过期机制
- 添加了`sizeBytes`、`restoreCount`、`lastRestoredAt`字段
- 添加了索引以优化查询性能

### 2.2 新增Repository

#### 2.2.1 StateRepository

```typescript
// src/infrastructure/persistence/repositories/state-repository.ts

import { injectable, inject } from 'inversify';
import { StateRepository as IStateRepository, StateQuery } from '../../../domain/state/repositories/state-repository';
import { State } from '../../../domain/state/entities/state';
import { ID } from '../../../domain/common/value-objects/id';
import { StateType } from '../../../domain/state/value-objects/state-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { StateData } from '../../../domain/state/value-objects/state-data';
import { StateModel } from '../models/state.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class StateRepository extends BaseRepository<State, StateModel, ID> implements IStateRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => StateModel {
    return StateModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: StateModel): State {
    try {
      const stateData = StateData.create(
        ID.fromString(model.entityId),
        model.entityType,
        model.state,
        model.context
      );

      const stateProps = {
        id: ID.fromString(model.id),
        type: StateType.fromString(model.type),
        data: stateData,
        metadata: model.metadata || {},
        createdAt: Timestamp.fromDate(model.createdAt),
        updatedAt: Timestamp.fromDate(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted
      };

      return State.fromProps(stateProps);
    } catch (error) {
      const errorMessage = `State模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: State): StateModel {
    try {
      const model = new StateModel();

      model.id = entity.stateId.value;
      model.type = entity.type.toString();
      model.entityId = entity.data.entityId.value;
      model.entityType = entity.data.entityType;
      model.state = entity.data.state;
      model.context = entity.data.context;
      model.timestamp = entity.data.timestamp;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();

      return model;
    } catch (error) {
      const errorMessage = `State实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.stateId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 根据实体ID和类型查找状态
   */
  async findByEntity(entityId: ID, entityType: string): Promise<State[]> {
    return this.find({
      filters: {
        entityId: entityId.value,
        entityType
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据类型查找状态
   */
  async findByType(type: StateType): Promise<State[]> {
    return this.find({
      filters: { type: type.toString() },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查询状态
   */
  async query(query: StateQuery): Promise<State[]> {
    const filters: Record<string, unknown> = {};

    if (query.type) {
      filters.type = query.type.toString();
    }

    if (query.entityId) {
      filters.entityId = query.entityId.value;
    }

    if (query.entityType) {
      filters.entityType = query.entityType;
    }

    return this.find({
      filters,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      limit: query.limit,
      offset: query.offset
    });
  }

  /**
   * 删除实体的所有状态
   */
  async deleteByEntity(entityId: ID, entityType: string): Promise<number> {
    return this.deleteWhere({
      filters: {
        entityId: entityId.value,
        entityType
      }
    });
  }

  /**
   * 查找实体的最新状态
   */
  async findLatestByEntity(entityId: ID, entityType: string): Promise<State | null> {
    return this.findOne({
      filters: {
        entityId: entityId.value,
        entityType
      },
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定时间范围内的状态
   */
  async findByTimeRange(
    entityId: ID,
    entityType: string,
    startTime: number,
    endTime: number
  ): Promise<State[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('state')
      .where('state.entityId = :entityId', { entityId: entityId.value })
      .andWhere('state.entityType = :entityType', { entityType })
      .andWhere('state.timestamp BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('state.timestamp', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 统计实体的状态数量
   */
  async countByEntity(entityId: ID, entityType: string): Promise<number> {
    return this.count({
      filters: {
        entityId: entityId.value,
        entityType
      }
    });
  }
}
```

#### 2.2.2 SnapshotRepository

```typescript
// src/infrastructure/persistence/repositories/snapshot-repository.ts

import { injectable, inject } from 'inversify';
import { SnapshotRepository as ISnapshotRepository, SnapshotQuery } from '../../../domain/snapshot/repositories/snapshot-repository';
import { Snapshot } from '../../../domain/snapshot/entities/snapshot';
import { ID } from '../../../domain/common/value-objects/id';
import { SnapshotType } from '../../../domain/snapshot/value-objects/snapshot-type';
import { SnapshotScope } from '../../../domain/snapshot/value-objects/snapshot-scope';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { SnapshotModel } from '../models/snapshot.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class SnapshotRepository extends BaseRepository<Snapshot, SnapshotModel, ID> implements ISnapshotRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => SnapshotModel {
    return SnapshotModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: SnapshotModel): Snapshot {
    try {
      const snapshotProps = {
        id: ID.fromString(model.id),
        type: SnapshotType.fromString(model.type),
        scope: SnapshotScope.fromString(model.scope),
        targetId: model.targetId ? ID.fromString(model.targetId) : undefined,
        title: model.title,
        description: model.description,
        stateData: model.stateData,
        metadata: model.metadata || {},
        createdAt: Timestamp.fromDate(model.createdAt),
        updatedAt: Timestamp.fromDate(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted,
        sizeBytes: model.sizeBytes,
        restoreCount: model.restoreCount,
        lastRestoredAt: model.lastRestoredAt ? Timestamp.fromDate(model.lastRestoredAt) : undefined
      };

      return Snapshot.fromProps(snapshotProps);
    } catch (error) {
      const errorMessage = `Snapshot模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Snapshot): SnapshotModel {
    try {
      const model = new SnapshotModel();

      model.id = entity.snapshotId.value;
      model.type = entity.type.toString();
      model.scope = entity.scope.toString();
      model.targetId = entity.targetId?.value;
      model.title = entity.title;
      model.description = entity.description;
      model.stateData = entity.stateData;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();
      model.sizeBytes = entity.sizeBytes;
      model.restoreCount = entity.restoreCount;
      model.lastRestoredAt = entity.lastRestoredAt?.toDate();

      return model;
    } catch (error) {
      const errorMessage = `Snapshot实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.snapshotId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 根据范围和目标ID查找快照
   */
  async findByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot[]> {
    return this.find({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据范围查找快照
   */
  async findByScope(scope: SnapshotScope): Promise<Snapshot[]> {
    return this.find({
      filters: { scope: scope.toString() },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查询快照
   */
  async query(query: SnapshotQuery): Promise<Snapshot[]> {
    const filters: Record<string, unknown> = {};

    if (query.scope) {
      filters.scope = query.scope.toString();
    }

    if (query.targetId) {
      filters.targetId = query.targetId.value;
    }

    if (query.type) {
      filters.type = query.type.toString();
    }

    return this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: query.limit,
      offset: query.offset
    });
  }

  /**
   * 删除范围和目标ID的所有快照
   */
  async deleteByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number> {
    return this.deleteWhere({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      }
    });
  }

  /**
   * 查找最新的快照
   */
  async findLatestByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot | null> {
    return this.findOne({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定时间范围内的快照
   */
  async findByTimeRange(
    scope: SnapshotScope,
    startTime: Date,
    endTime: Date
  ): Promise<Snapshot[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('snapshot')
      .where('snapshot.scope = :scope', { scope: scope.toString() })
      .andWhere('snapshot.createdAt BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('snapshot.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 统计快照数量
   */
  async countByScope(scope: SnapshotScope): Promise<number> {
    return this.count({
      filters: { scope: scope.toString() }
    });
  }

  /**
   * 统计范围和目标ID的快照数量
   */
  async countByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number> {
    return this.count({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      }
    });
  }

  /**
   * 获取快照统计信息
   */
  async getStatistics(scope?: SnapshotScope): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSizeBytes: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const filters: Record<string, unknown> = {};
    if (scope) {
      filters.scope = scope.toString();
    }

    const snapshots = await this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const byType: Record<string, number> = {};
    let totalSizeBytes = 0;
    let latestAt: Date | undefined;
    let oldestAt: Date | undefined;

    snapshots.forEach(snapshot => {
      const type = snapshot.type.toString();
      byType[type] = (byType[type] || 0) + 1;
      totalSizeBytes += snapshot.sizeBytes;

      const createdAt = snapshot.createdAt.toDate();
      if (!latestAt || createdAt > latestAt) {
        latestAt = createdAt;
      }
      if (!oldestAt || createdAt < oldestAt) {
        oldestAt = createdAt;
      }
    });

    return {
      total: snapshots.length,
      byType,
      totalSizeBytes,
      latestAt,
      oldestAt
    };
  }
}
```

### 2.3 修改CheckpointRepository

```typescript
// src/infrastructure/persistence/repositories/checkpoint-repository.ts

import { injectable, inject } from 'inversify';
import { CheckpointRepository as ICheckpointRepository } from '../../../domain/checkpoint/repositories/checkpoint-repository';
import { ThreadCheckpoint } from '../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { ID } from '../../../domain/common/value-objects/id';
import { CheckpointType } from '../../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointStatus } from '../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { CheckpointModel } from '../models/checkpoint.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class CheckpointRepository extends BaseRepository<ThreadCheckpoint, CheckpointModel, ID> implements ICheckpointRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => CheckpointModel {
    return CheckpointModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: CheckpointModel): ThreadCheckpoint {
    try {
      const checkpointProps = {
        id: ID.fromString(model.id),
        threadId: ID.fromString(model.threadId),
        type: CheckpointType.fromString(model.type),
        status: CheckpointStatus.fromString(model.status),
        title: model.title,
        description: model.description,
        stateData: model.stateData,
        tags: model.tags || [],
        metadata: model.metadata || {},
        createdAt: Timestamp.fromDate(model.createdAt),
        updatedAt: Timestamp.fromDate(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted,
        expiresAt: model.expiresAt ? Timestamp.fromDate(model.expiresAt) : undefined,
        sizeBytes: model.sizeBytes,
        restoreCount: model.restoreCount,
        lastRestoredAt: model.lastRestoredAt ? Timestamp.fromDate(model.lastRestoredAt) : undefined
      };

      return ThreadCheckpoint.fromProps(checkpointProps);
    } catch (error) {
      const errorMessage = `Checkpoint模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: ThreadCheckpoint): CheckpointModel {
    try {
      const model = new CheckpointModel();

      model.id = entity.checkpointId.value;
      model.threadId = entity.threadId.value;
      model.type = entity.type.toString();
      model.status = entity.status.toString();
      model.title = entity.title;
      model.description = entity.description;
      model.stateData = entity.stateData;
      model.tags = entity.tags;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();
      model.expiresAt = entity.expiresAt?.toDate();
      model.sizeBytes = entity.sizeBytes;
      model.restoreCount = entity.restoreCount;
      model.lastRestoredAt = entity.lastRestoredAt?.toDate();

      return model;
    } catch (error) {
      const errorMessage = `Checkpoint实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.checkpointId.value, operation: 'toModel' };
      throw customError;
    }
  }

  // ... 保留现有的查询方法，但需要更新以支持新的字段

  /**
   * 查找有效的检查点
   */
  async findValidByThreadId(threadId: ID): Promise<ThreadCheckpoint[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('checkpoint')
      .where('checkpoint.threadId = :threadId', { threadId: threadId.value })
      .andWhere('checkpoint.isDeleted = false')
      .andWhere('checkpoint.status = :status', { status: 'active' })
      .andWhere('(checkpoint.expiresAt IS NULL OR checkpoint.expiresAt > :now)', { now: new Date() })
      .orderBy('checkpoint.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找过期的检查点
   */
  async findExpired(): Promise<ThreadCheckpoint[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('checkpoint')
      .where('checkpoint.isDeleted = false')
      .andWhere('checkpoint.status = :status', { status: 'active' })
      .andWhere('checkpoint.expiresAt IS NOT NULL')
      .andWhere('checkpoint.expiresAt < :now', { now: new Date() })
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 清理过期的检查点
   */
  async cleanupExpired(): Promise<number> {
    const expiredCheckpoints = await this.findExpired();
    let count = 0;

    for (const checkpoint of expiredCheckpoints) {
      const expiredCheckpoint = checkpoint.markExpired();
      await this.save(expiredCheckpoint);
      count++;
    }

    return count;
  }
}
```

### 2.4 增强BaseRepository

```typescript
// src/infrastructure/persistence/repositories/base-repository.ts

import { injectable, inject } from 'inversify';
import { Repository as IRepository, IQueryOptions, PaginatedResult } from '../../../domain/common/repositories/repository';
import { ID } from '../../../domain/common/value-objects/id';
import { ConnectionManager } from '../connections/connection-manager';
import { DataSource, Repository, FindOptionsWhere, FindManyOptions, ObjectLiteral } from 'typeorm';

/**
 * 通用仓储基类（增强版）
 *
 * 提供基础的CRUD操作，支持事务、批量操作、缓存
 */
@injectable()
export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  protected abstract getModelClass(): new () => TModel;

  constructor(
    @inject('ConnectionManager') protected connectionManager: ConnectionManager
  ) {}

  /**
   * 获取TypeORM仓储实例
   */
  protected async getRepository(): Promise<Repository<TModel>> {
    const connection = await this.connectionManager.getConnection();
    return connection.getRepository<TModel>(this.getModelClass());
  }

  /**
   * 获取数据源
   */
  protected async getDataSource(): Promise<DataSource> {
    return this.connectionManager.getConnection();
  }

  /**
   * 默认实体转换方法，子类可以重写
   */
  protected toDomain(model: TModel): T {
    return model as any;
  }

  /**
   * 默认模型转换方法，子类可以重写
   */
  protected toModel(domain: T): TModel {
    return domain as any;
  }

  /**
   * 构建ID查询条件
   */
  protected buildIdWhere(id: TId): Record<string, unknown> {
    if (id instanceof ID) {
      return { id: id.value };
    }
    return { id };
  }

  /**
   * 构建查询选项
   */
  protected buildFindOptions(options?: IQueryOptions): FindManyOptions<TModel> {
    if (!options) return {};

    const findOptions: FindManyOptions<TModel> = {};

    if (options.offset !== undefined) {
      findOptions.skip = options.offset;
    }

    if (options.limit !== undefined) {
      findOptions.take = options.limit;
    }

    if (options.sortBy) {
      findOptions.order = { [options.sortBy]: options.sortOrder || 'asc' } as any;
    }

    if (options.filters) {
      findOptions.where = options.filters as FindOptionsWhere<TModel>;
    }

    return findOptions;
  }

  // ========== 核心CRUD操作 ==========

  /**
   * 根据ID查找实体
   */
  async findById(id: TId): Promise<T | null> {
    try {
      const repository = await this.getRepository();
      const model = await repository.findOne({
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
      });

      if (!model) {
        return null;
      }

      return this.toDomain(model);
    } catch (error) {
      console.error('根据ID查找实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找实体，如果不存在则抛出异常
   */
  async findByIdOrFail(id: TId): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`实体不存在: ${id}`);
    }
    return entity;
  }

  /**
   * 查找所有实体
   */
  async findAll(): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = await repository.find();
      return models.map(model => this.toDomain(model));
    } catch (error) {
      console.error('查找所有实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据条件查找实体
   */
  async find(options?: IQueryOptions): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = await repository.find(this.buildFindOptions(options));
      return models.map(model => this.toDomain(model));
    } catch (error) {
      console.error('条件查找实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据条件查找单个实体
   */
  async findOne(options: IQueryOptions): Promise<T | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  /**
   * 根据条件查找单个实体，如果不存在则抛出异常
   */
  async findOneOrFail(options: IQueryOptions): Promise<T> {
    const entity = await this.findOne(options);
    if (!entity) {
      throw new Error('未找到符合条件的实体');
    }
    return entity;
  }

  /**
   * 分页查询实体
   */
  async findWithPagination(options: IQueryOptions): Promise<PaginatedResult<T>> {
    try {
      const repository = await this.getRepository();
      const pageSize = options.limit ?? 10;
      const page = options.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
      const skip = (page - 1) * pageSize;

      const findOptions = this.buildFindOptions({
        ...options,
        offset: skip,
        limit: pageSize
      });

      const [models, total] = await repository.findAndCount(findOptions);
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: models.map(model => this.toDomain(model)),
        total,
        page,
        pageSize: pageSize,
        totalPages
      };
    } catch (error) {
      console.error('分页查询实体失败:', error);
      throw error;
    }
  }

  /**
   * 保存实体
   */
  async save(entity: T): Promise<T> {
    try {
      const repository = await this.getRepository();
      const model = this.toModel(entity);
      const savedModel = await repository.save(model);
      return this.toDomain(savedModel);
    } catch (error) {
      console.error('保存实体失败:', error);
      throw error;
    }
  }

  /**
   * 批量保存实体
   */
  async saveBatch(entities: T[]): Promise<T[]> {
    try {
      const repository = await this.getRepository();
      const models = entities.map(entity => this.toModel(entity));
      const savedModels = await repository.save(models);
      return savedModels.map(model => this.toDomain(model));
    } catch (error) {
      console.error('批量保存实体失败:', error);
      throw error;
    }
  }

  /**
   * 删除实体
   */
  async delete(entity: T): Promise<void> {
    try {
      const repository = await this.getRepository();
      const model = this.toModel(entity);
      await repository.remove(model);
    } catch (error) {
      console.error('删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID删除实体
   */
  async deleteById(id: TId): Promise<void> {
    try {
      const repository = await this.getRepository();
      await repository.delete(this.buildIdWhere(id) as FindOptionsWhere<TModel>);
    } catch (error) {
      console.error('根据ID删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除实体
   */
  async deleteBatch(entities: T[]): Promise<void> {
    try {
      const repository = await this.getRepository();
      const models = entities.map(entity => this.toModel(entity));
      await repository.remove(models);
    } catch (error) {
      console.error('批量删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 根据条件删除实体
   */
  async deleteWhere(options: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();
      const findOptions = this.buildFindOptions(options);
      const result = await repository.delete(findOptions.where as any);
      return result.affected || 0;
    } catch (error) {
      console.error('根据条件删除实体失败:', error);
      throw error;
    }
  }

  /**
   * 检查实体是否存在
   */
  async exists(id: TId): Promise<boolean> {
    try {
      const repository = await this.getRepository();
      const count = await repository.count({
        where: this.buildIdWhere(id) as FindOptionsWhere<TModel>
      });
      return count > 0;
    } catch (error) {
      console.error('检查实体存在性失败:', error);
      throw error;
    }
  }

  /**
   * 统计实体数量
   */
  async count(options?: IQueryOptions): Promise<number> {
    try {
      const repository = await this.getRepository();
      return repository.count(this.buildFindOptions(options));
    } catch (error) {
      console.error('统计实体数量失败:', error);
      throw error;
    }
  }

  /**
   * 在事务中执行操作
   */
  async transaction<R>(callback: (manager: any) => Promise<R>): Promise<R> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### 2.5 新增StatePersistenceService

```typescript
// src/infrastructure/state/persistence/state-persistence-service.ts

import { injectable, inject } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { State } from '../../../domain/state/entities/state';
import { StateQuery } from '../../../domain/state/repositories/state-repository';
import { StateRepository } from '../../persistence/repositories/state-repository';
import { TYPES } from '../../../di/service-keys';

/**
 * 状态持久化策略枚举
 */
export enum PersistenceStrategy {
  REALTIME = 'realtime',    // 实时持久化
  BATCH = 'batch',          // 批量持久化
  DELAYED = 'delayed'       // 延迟持久化
}

/**
 * 状态持久化服务
 *
 * 提供状态的持久化功能，支持多种持久化策略
 */
@injectable()
export class StatePersistenceService {
  private batchQueue: State[] = [];
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 5000; // 5秒

  constructor(
    @inject(TYPES.StateRepository) private readonly stateRepository: StateRepository
  ) {}

  /**
   * 保存状态
   */
  async save(state: State, strategy: PersistenceStrategy = PersistenceStrategy.REALTIME): Promise<void> {
    switch (strategy) {
      case PersistenceStrategy.REALTIME:
        await this.stateRepository.save(state);
        break;

      case PersistenceStrategy.BATCH:
        await this.addToBatch(state);
        break;

      case PersistenceStrategy.DELAYED:
        await this.delayedSave(state);
        break;

      default:
        throw new Error(`未知的持久化策略: ${strategy}`);
    }
  }

  /**
   * 加载状态
   */
  async load(stateId: ID): Promise<State | null> {
    return await this.stateRepository.findById(stateId);
  }

  /**
   * 查询状态
   */
  async query(query: StateQuery): Promise<State[]> {
    return await this.stateRepository.query(query);
  }

  /**
   * 删除状态
   */
  async delete(stateId: ID): Promise<void> {
    await this.stateRepository.deleteById(stateId);
  }

  /**
   * 批量保存状态
   */
  async saveBatch(states: State[]): Promise<void> {
    await this.stateRepository.saveBatch(states);
  }

  /**
   * 添加到批量队列
   */
  private async addToBatch(state: State): Promise<void> {
    this.batchQueue.push(state);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.BATCH_INTERVAL);
    }
  }

  /**
   * 刷新批量队列
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const states = [...this.batchQueue];
    this.batchQueue = [];

    try {
      await this.stateRepository.saveBatch(states);
    } catch (error) {
      console.error('批量保存状态失败:', error);
      // 重新加入队列
      this.batchQueue.unshift(...states);
    }
  }

  /**
   * 延迟保存
   */
  private async delayedSave(state: State): Promise<void> {
    // 延迟1秒后保存
    setTimeout(async () => {
      try {
        await this.stateRepository.save(state);
      } catch (error) {
        console.error('延迟保存状态失败:', error);
      }
    }, 1000);
  }

  /**
   * 强制刷新批量队列
   */
  async forceFlush(): Promise<void> {
    await this.flushBatch();
  }

  /**
   * 获取批量队列大小
   */
  getBatchQueueSize(): number {
    return this.batchQueue.length;
  }
}
```

## 3. 数据库迁移

### 3.1 创建迁移脚本

```typescript
// migrations/1704800000000-AddStateAndSnapshotTables.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddStateAndSnapshotTables1704800000000 implements MigrationInterface {
  name = 'AddStateAndSnapshotTables1704800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建states表
    await queryRunner.createTable(
      new Table({
        name: 'states',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['session', 'thread', 'execution', 'node', 'checkpoint', 'snapshot'],
            default: "'thread'"
          },
          {
            name: 'entityId',
            type: 'uuid'
          },
          {
            name: 'entityType',
            type: 'varchar'
          },
          {
            name: 'state',
            type: 'jsonb'
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'timestamp',
            type: 'bigint'
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'version',
            type: 'varchar',
            default: "'1.0.0'"
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false
          }
        ]
      }),
      true
    );

    // 创建states表的索引
    await queryRunner.createIndex(
      'states',
      new TableIndex({
        name: 'IDX_states_entityId_entityType',
        columnNames: ['entityId', 'entityType']
      })
    );

    await queryRunner.createIndex(
      'states',
      new TableIndex({
        name: 'IDX_states_type',
        columnNames: ['type']
      })
    );

    await queryRunner.createIndex(
      'states',
      new TableIndex({
        name: 'IDX_states_timestamp',
        columnNames: ['timestamp']
      })
    );

    // 创建snapshots表
    await queryRunner.createTable(
      new Table({
        name: 'snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['automatic', 'manual', 'scheduled', 'error'],
            default: "'manual'"
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['session', 'thread', 'global'],
            default: "'thread'"
          },
          {
            name: 'targetId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'stateData',
            type: 'jsonb'
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'version',
            type: 'varchar',
            default: "'1.0.0'"
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false
          },
          {
            name: 'sizeBytes',
            type: 'bigint'
          },
          {
            name: 'restoreCount',
            type: 'int',
            default: 0
          },
          {
            name: 'lastRestoredAt',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // 创建snapshots表的索引
    await queryRunner.createIndex(
      'snapshots',
      new TableIndex({
        name: 'IDX_snapshots_scope_targetId',
        columnNames: ['scope', 'targetId']
      })
    );

    await queryRunner.createIndex(
      'snapshots',
      new TableIndex({
        name: 'IDX_snapshots_type',
        columnNames: ['type']
      })
    );

    await queryRunner.createIndex(
      'snapshots',
      new TableIndex({
        name: 'IDX_snapshots_createdAt',
        columnNames: ['createdAt']
      })
    );

    // 更新checkpoints表
    await queryRunner.addColumn(
      'checkpoints',
      'status',
      {
        type: 'enum',
        enum: ['active', 'expired', 'corrupted', 'archived'],
        default: "'active'"
      }
    );

    await queryRunner.addColumn(
      'checkpoints',
      'expiresAt',
      {
        type: 'timestamp',
        isNullable: true
      }
    );

    await queryRunner.addColumn(
      'checkpoints',
      'sizeBytes',
      {
        type: 'bigint',
        default: 0
      }
    );

    await queryRunner.addColumn(
      'checkpoints',
      'restoreCount',
      {
        type: 'int',
        default: 0
      }
    );

    await queryRunner.addColumn(
      'checkpoints',
      'lastRestoredAt',
      {
        type: 'timestamp',
        isNullable: true
      }
    );

    // 创建checkpoints表的索引
    await queryRunner.createIndex(
      'checkpoints',
      new TableIndex({
        name: 'IDX_checkpoints_status',
        columnNames: ['status']
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除snapshots表
    await queryRunner.dropTable('snapshots');

    // 删除states表
    await queryRunner.dropTable('states');

    // 删除checkpoints表的新列
    await queryRunner.dropColumn('checkpoints', 'lastRestoredAt');
    await queryRunner.dropColumn('checkpoints', 'restoreCount');
    await queryRunner.dropColumn('checkpoints', 'sizeBytes');
    await queryRunner.dropColumn('checkpoints', 'expiresAt');
    await queryRunner.dropColumn('checkpoints', 'status');

    // 删除checkpoints表的索引
    await queryRunner.dropIndex('checkpoints', 'IDX_checkpoints_status');
  }
}
```

## 4. 实施计划

### 4.1 第一阶段：新增Model和Repository

**任务**:
1. 创建`StateModel`
2. 创建`SnapshotModel`
3. 更新`CheckpointModel`
4. 创建`StateRepository`
5. 创建`SnapshotRepository`
6. 更新`CheckpointRepository`

**验收标准**:
- 所有Model定义完成
- 所有Repository实现完成
- 单元测试通过

### 4.2 第二阶段：增强BaseRepository

**任务**:
1. 增强`BaseRepository`，添加事务支持
2. 创建`StatePersistenceService`
3. 实现批量持久化策略

**验收标准**:
- BaseRepository增强完成
- StatePersistenceService实现完成
- 集成测试通过

### 4.3 第三阶段：数据库迁移

**任务**:
1. 创建数据库迁移脚本
2. 执行迁移
3. 验证迁移结果

**验收标准**:
- 迁移脚本创建完成
- 迁移执行成功
- 数据验证通过

### 4.4 第四阶段：集成测试

**任务**:
1. 编写集成测试
2. 测试所有Repository
3. 测试StatePersistenceService
4. 性能测试

**验收标准**:
- 所有集成测试通过
- 性能指标达标

## 5. 风险和挑战

### 5.1 数据迁移风险

**风险**:
- 现有数据可能不兼容新的Model结构
- 迁移过程中可能出现数据丢失

**缓解措施**:
- 迁移前备份数据
- 编写数据迁移脚本
- 充分测试迁移脚本

### 5.2 性能风险

**风险**:
- 新增的索引可能影响写入性能
- 批量持久化可能导致数据延迟

**缓解措施**:
- 优化索引设计
- 监控性能指标
- 提供多种持久化策略

### 5.3 兼容性风险

**风险**:
- 新的Repository可能不兼容现有代码
- 接口变更可能导致编译错误

**缓解措施**:
- 保持向后兼容
- 提供迁移指南
- 充分的测试

## 6. 附录

### 6.1 术语表

- **Model**: TypeORM实体模型，用于数据库映射
- **Repository**: 仓储模式，用于数据访问
- **Persistence**: 持久化，将数据保存到数据库
- **Migration**: 数据库迁移，用于数据库结构变更
- **Index**: 索引，用于优化查询性能

### 6.2 参考资料

- [state-management-design.md](./state-management-design.md)
- [state-management-requirements.md](./state-management-requirements.md)
- [TypeORM Documentation](https://typeorm.io/)

### 6.3 变更历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0.0 | 2025-01-09 | Architect | 初始版本 |