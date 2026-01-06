# 持久化层分析报告

## 一、执行状态设计分析

### 1.1 当前状态定义

项目中存在多个状态相关的值对象，需要明确它们的职责边界：

#### 1.1.1 WorkflowStatus（工作流状态）
**位置**: `src/domain/workflow/value-objects/workflow-status.ts`

```typescript
enum WorkflowStatusValue {
  DRAFT = 'draft',      // 草稿
  ACTIVE = 'active',    // 活跃（可执行）
  INACTIVE = 'inactive',// 非活跃
  ARCHIVED = 'archived' // 已归档
}
```

**职责**: 表示工作流定义的生命周期状态
- **DRAFT**: 编辑中，可以修改节点和边
- **ACTIVE**: 已发布，可以执行
- **INACTIVE**: 暂停使用，不能执行
- **ARCHIVED**: 已归档，软删除状态

#### 1.1.2 ExecutionStatus（执行状态）
**位置**: `src/domain/workflow/value-objects/execution/execution-status.ts`

```typescript
enum ExecutionStatusValue {
  PENDING = 'pending',    // 待执行
  RUNNING = 'running',    // 运行中
  COMPLETED = 'completed',// 已完成
  FAILED = 'failed',      // 失败
  CANCELLED = 'cancelled',// 已取消
  PAUSED = 'paused'       // 已暂停
}
```

**职责**: 表示工作流或节点的执行状态
- **PENDING**: 等待执行
- **RUNNING**: 正在执行
- **COMPLETED**: 执行成功完成
- **FAILED**: 执行失败
- **CANCELLED**: 被取消
- **PAUSED**: 暂停执行

#### 1.1.3 ThreadStatus（线程状态）
**位置**: `src/domain/threads/value-objects/thread-status.ts`

```typescript
enum ThreadStatusValue {
  PENDING = 'pending',    // 待执行
  RUNNING = 'running',    // 运行中
  PAUSED = 'paused',      // 已暂停
  COMPLETED = 'completed',// 已完成
  FAILED = 'failed',      // 失败
  CANCELLED = 'cancelled'// 已取消
}
```

**职责**: 表示线程的执行状态（与 ExecutionStatus 类似，但用于线程级别）

#### 1.1.4 SessionStatus（会话状态）
**位置**: `src/domain/sessions/value-objects/session-status.ts`

```typescript
enum SessionStatusValue {
  ACTIVE = 'active',      // 活跃
  INACTIVE = 'inactive',  // 非活跃
  SUSPENDED = 'suspended',// 暂停
  TERMINATED = 'terminated' // 已终止
}
```

**职责**: 表示会话的生命周期状态

### 1.2 状态层次关系

```
Session (会话)
  └── Thread (线程) - ThreadStatus
        └── Workflow Execution (工作流执行) - ExecutionStatus
              └── Node Execution (节点执行) - ExecutionStatus
                    └── Tool Execution (工具执行) - ToolExecutionStatus
```

### 1.3 状态转换规则

#### 1.3.1 WorkflowStatus 转换
```
DRAFT → ACTIVE → INACTIVE → ARCHIVED
  ↓        ↓
  └────────┴──→ ARCHIVED (软删除)
```

#### 1.3.2 ExecutionStatus/ThreadStatus 转换
```
PENDING → RUNNING → COMPLETED
  ↓         ↓
  └────→ PAUSED ──┘
  ↓         ↓
CANCELLED  FAILED
```

### 1.4 执行状态持久化建议

#### 方案1：在 ThreadModel 中存储执行状态（推荐）

```typescript
@Entity('threads')
export class ThreadModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column({ nullable: true })
  workflowId?: string;

  @Column()
  name!: string;

  // 线程状态（生命周期状态）
  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  state!: string;

  // 执行状态（运行时状态）
  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  executionStatus!: string;

  // 执行进度
  @Column({ type: 'int', default: 0 })
  progress!: number;

  // 当前步骤
  @Column({ nullable: true })
  currentStep?: string;

  // 开始时间
  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  // 完成时间
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // 错误信息
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  // 重试次数
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  // 最后活动时间
  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  // 执行上下文（JSONB）
  @Column('jsonb')
  executionContext!: Record<string, unknown>;

  // 节点执行状态（JSONB）
  @Column('jsonb', { nullable: true })
  nodeExecutions?: Record<string, unknown>;

  // 工作流状态（JSONB）
  @Column('jsonb', { nullable: true })
  workflowState?: Record<string, unknown>;
}
```

#### 方案2：创建独立的 ThreadExecutionModel

```typescript
@Entity('thread_executions')
export class ThreadExecutionModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  threadId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status!: string;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ nullable: true })
  currentStep?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  @Column('jsonb')
  context!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  nodeExecutions?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  workflowState?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => ThreadModel, thread => thread.executions)
  @JoinColumn({ name: 'threadId' })
  thread?: ThreadModel;
}
```

**推荐使用方案1**，因为：
1. 线程和执行状态是1:1关系，分离会增加复杂度
2. 执行状态是线程的核心属性，应该紧密耦合
3. 减少JOIN操作，提高查询性能

---

## 二、Model 层分析

### 2.1 已实现的 Model（8个）

| Model | 文件路径 | 状态 | 问题 |
|-------|---------|------|------|
| WorkflowModel | `workflow.model.ts` | ✅ 已实现 | 类型安全问题 |
| SessionModel | `session.model.ts` | ✅ 已实现 | 类型安全问题 |
| ThreadModel | `thread.model.ts` | ✅ 已实现 | 缺少执行状态字段 |
| MessageModel | `message.model.ts` | ✅ 已实现 | 类型安全问题 |
| HistoryModel | `history.model.ts` | ✅ 已实现 | 类型安全问题 |
| SnapshotModel | `snapshot.model.ts` | ✅ 已实现 | 类型安全问题 |
| ThreadCheckpointModel | `thread-checkpoint.model.ts` | ✅ 已实现 | 类型安全问题 |
| ExecutionStatsModel | `execution-stats.model.ts` | ✅ 已实现 | 循环依赖已修复 |

### 2.2 缺失的 Model（6个）

| Model | 领域实体 | 优先级 | 说明 |
|-------|---------|--------|------|
| CheckpointModel | Checkpoint | 🔴 高 | 检查点实体 |
| LLMRequestModel | LLMRequest | 🔴 高 | LLM请求实体 |
| LLMResponseModel | LLMResponse | 🔴 高 | LLM响应实体 |
| ToolModel | Tool | 🔴 高 | 工具实体 |
| ToolExecutionModel | ToolExecution | 🟡 中 | 工具执行实体 |
| ToolResultModel | ToolResult | 🟡 中 | 工具结果实体 |

### 2.3 Model 层存在的问题

#### 问题1：类型安全缺失

**问题描述**：
大量使用 `any` 类型，缺乏类型约束，容易导致运行时错误。

**示例**：
```typescript
// workflow.model.ts
@Column('jsonb', { nullable: true })
nodes?: any;  // ❌ 应该是 Map<string, Node>

@Column('jsonb', { nullable: true })
edges?: any;  // ❌ 应该是 Map<string, EdgeValueObject>

@Column('jsonb', { nullable: true })
definition?: any;  // ❌ 应该是 WorkflowDefinition

@Column('jsonb')
metadata!: any;  // ❌ 应该是 Record<string, unknown>
```

**影响**：
- 编译时无法捕获类型错误
- IDE 无法提供智能提示
- 运行时可能出现类型不匹配错误

**解决方案**：
```typescript
// ✅ 正确做法
import { Node } from '../../../domain/workflow/entities/node';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge';
import { WorkflowDefinition } from '../../../domain/workflow/value-objects/workflow-definition';

@Column('jsonb', { nullable: true })
nodes?: Record<string, Node>;

@Column('jsonb', { nullable: true })
edges?: Record<string, EdgeValueObject>;

@Column('jsonb', { nullable: true })
definition?: WorkflowDefinition;

@Column('jsonb')
metadata!: Record<string, unknown>;
```

#### 问题2：循环依赖

**问题描述**：
WorkflowModel 和 ExecutionStatsModel 之间存在循环依赖。

**已修复方案**：
使用 TypeORM 字符串延迟导入：
```typescript
// workflow.model.ts
@OneToMany('ExecutionStatsModel', 'workflow')
executionStats?: any[];

// execution-stats.model.ts
@ManyToOne('WorkflowModel', 'executionStats')
@JoinColumn({ name: 'workflowId' })
workflow?: any;
```

#### 问题3：缺少执行状态字段

**问题描述**：
ThreadModel 缺少执行状态相关字段，无法完整持久化 ThreadExecution 值对象。

**当前 ThreadModel**：
```typescript
@Entity('threads')
export class ThreadModel {
  @Column()
  state!: string;  // ❌ 只有生命周期状态，缺少执行状态
  
  // 缺少以下字段：
  // - executionStatus
  // - progress
  // - currentStep
  // - startedAt
  // - completedAt
  // - errorMessage
  // - retryCount
  // - lastActivityAt
  // - executionContext
  // - nodeExecutions
  // - workflowState
}
```

**建议添加**：
```typescript
@Entity('threads')
export class ThreadModel {
  // 线程生命周期状态
  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active',
  })
  state!: string;

  // 执行状态
  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  executionStatus!: string;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ nullable: true })
  currentStep?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  @Column('jsonb')
  executionContext!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  nodeExecutions?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  workflowState?: Record<string, unknown>;
}
```

#### 问题4：枚举值硬编码

**问题描述**：
枚举值直接硬编码在装饰器中，与 domain 层的值对象不同步。

**示例**：
```typescript
// ❌ 硬编码
@Column({
  type: 'enum',
  enum: ['draft', 'active', 'inactive', 'archived'],
  default: 'draft',
})
state!: string;
```

**解决方案**：
```typescript
// ✅ 从 domain 层导入
import { WorkflowStatusValue } from '../../../domain/workflow/value-objects/workflow-status';

@Column({
  type: 'enum',
  enum: Object.values(WorkflowStatusValue),
  default: WorkflowStatusValue.DRAFT,
})
state!: string;
```

---

## 三、Repository 层分析

### 3.1 已实现的 Repository（8个）

| Repository | 文件路径 | 状态 | 完成度 |
|------------|---------|------|--------|
| BaseRepository | `base-repository.ts` | ✅ 已实现 | 100% |
| WorkflowRepository | `workflow-repository.ts` | ✅ 已实现 | 100% |
| SessionRepository | `session-repository.ts` | ✅ 已实现 | 100% |
| ThreadRepository | `thread-repository.ts` | ✅ 已实现 | 100% |
| HistoryRepository | `history-repository.ts` | ✅ 已实现 | 100% |
| SnapshotRepository | `snapshot-repository.ts` | ✅ 已实现 | 100% |
| ThreadCheckpointRepository | `thread-checkpoint-repository.ts` | ✅ 已实现 | 100% |
| PromptRepository | `prompt-repository.ts` | ✅ 已实现 | 100% |

### 3.2 缺失的 Repository（6个）

| Repository | 领域接口 | 优先级 | 方法数 | 说明 |
|------------|---------|--------|--------|------|
| CheckpointRepository | ICheckpointRepository | 🔴 高 | 13 | 检查点仓储 |
| LLMRequestRepository | ILLMRequestRepository | 🔴 高 | 26 | LLM请求仓储 |
| LLMResponseRepository | ILLMResponseRepository | 🔴 高 | ~20 | LLM响应仓储 |
| ToolRepository | IToolRepository | 🔴 高 | 32 | 工具仓储 |
| ToolExecutionRepository | IToolExecutionRepository | 🟡 中 | ~15 | 工具执行仓储 |
| ToolResultRepository | IToolResultRepository | 🟡 中 | ~10 | 工具结果仓储 |

### 3.3 Repository 层存在的问题

#### 问题1：类型转换不完整

**问题描述**：
`toDomain` 和 `toModel` 方法中存在类型转换不完整的问题。

**示例**：
```typescript
// workflow-repository.ts
protected override toDomain(model: WorkflowModel): Workflow {
  const definition = WorkflowDefinition.fromProps({
    // ...
    errorHandlingStrategy: {} as any,  // ❌ 类型转换不完整
    executionStrategy: {} as any,        // ❌ 类型转换不完整
  });
}
```

**解决方案**：
```typescript
import { ErrorHandlingStrategy } from '../../../domain/workflow/value-objects/error-handling-strategy';
import { ExecutionStrategy } from '../../../domain/workflow/value-objects/execution/execution-strategy';

protected override toDomain(model: WorkflowModel): Workflow {
  const definition = WorkflowDefinition.fromProps({
    // ...
    errorHandlingStrategy: ErrorHandlingStrategy.stopOnError(),
    executionStrategy: ExecutionStrategy.sequential(),
  });
}
```

#### 问题2：错误处理不一致

**问题描述**：
部分 Repository 使用 `console.error`，部分使用自定义错误。

**示例**：
```typescript
// ❌ 不一致
async findById(id: TId): Promise<T | null> {
  try {
    // ...
  } catch (error) {
    console.error('根据ID查找实体失败:', error);  // 使用 console.error
    throw error;
  }
}

// ✅ 应该统一
async findById(id: TId): Promise<T | null> {
  try {
    // ...
  } catch (error) {
    throw new RepositoryError(
      `根据ID查找实体失败: ${id}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
```

#### 问题3：缺少事务支持

**问题描述**：
Repository 层没有提供事务支持，无法保证数据一致性。

**解决方案**：
```typescript
// 在 BaseRepository 中添加事务支持
async executeInTransaction<T>(
  callback: (entityManager: EntityManager) => Promise<T>
): Promise<T> {
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
```

#### 问题4：缺少缓存支持

**问题描述**：
频繁查询的数据没有缓存机制，影响性能。

**解决方案**：
```typescript
// 在 BaseRepository 中添加缓存支持
private cache = new Map<string, { data: T; expiresAt: number }>();

async findByIdWithCache(id: TId, ttl: number = 60000): Promise<T | null> {
  const cacheKey = `${this.getModelClass().name}:${id}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  const entity = await this.findById(id);
  if (entity) {
    this.cache.set(cacheKey, {
      data: entity,
      expiresAt: Date.now() + ttl,
    });
  }
  
  return entity;
}
```

---

## 四、改进建议

### 4.1 优先级1：补充核心仓储（高优先级）

#### 4.1.1 实现 ToolRepository

**步骤**：
1. 创建 `ToolModel`
2. 实现 `ToolRepository`
3. 添加类型转换方法
4. 实现所有32个接口方法

**关键方法**：
```typescript
export class ToolRepository extends BaseRepository<Tool, ToolModel, ID> {
  // 按名称查找
  async findByName(name: string): Promise<Tool | null> {
    return this.findOne({ filters: { name } });
  }
  
  // 按类型查找
  async findByType(type: ToolType): Promise<Tool[]> {
    return this.find({ filters: { type: type.getValue() } });
  }
  
  // 更新使用统计
  async updateUsageStatistics(
    toolId: ID,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    const tool = await this.findById(toolId);
    if (!tool) {
      throw new Error('工具不存在');
    }
    
    // 更新统计信息
    const updatedTool = tool.updateUsageStatistics(executionTime, success);
    await this.save(updatedTool);
  }
}
```

#### 4.1.2 实现 LLMRequestRepository

**步骤**：
1. 创建 `LLMRequestModel`
2. 实现 `LLMRequestRepository`
3. 实现所有26个接口方法

**关键方法**：
```typescript
export class LLMRequestRepository extends BaseRepository<LLMRequest, LLMRequestModel, ID> {
  // 按会话ID查找
  async findBySessionId(sessionId: ID): Promise<LLMRequest[]> {
    return this.find({ filters: { sessionId: sessionId.value } });
  }
  
  // 获取统计信息
  async getStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    model?: string;
  }): Promise<{
    total: number;
    byModel: Record<string, number>;
    averageMessages: number;
  }> {
    // 实现统计逻辑
  }
}
```

### 4.2 优先级2：完善类型安全（高优先级）

#### 4.2.1 导入 domain 层的值对象

**修改所有 Model 文件**：
```typescript
// workflow.model.ts
import { WorkflowStatusValue } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowTypeValue } from '../../../domain/workflow/value-objects/workflow-type';

@Entity('workflows')
export class WorkflowModel {
  @Column({
    type: 'enum',
    enum: Object.values(WorkflowStatusValue),
    default: WorkflowStatusValue.DRAFT,
  })
  state!: WorkflowStatusValue;

  @Column({
    type: 'enum',
    enum: Object.values(WorkflowTypeValue),
    default: WorkflowTypeValue.SEQUENTIAL,
  })
  executionMode!: WorkflowTypeValue;
}
```

#### 4.2.2 添加类型验证

**在 Repository 的 toDomain 方法中添加验证**：
```typescript
protected override toDomain(model: WorkflowModel): Workflow {
  // 验证状态值
  if (!Object.values(WorkflowStatusValue).includes(model.state as WorkflowStatusValue)) {
    throw new Error(`无效的工作流状态: ${model.state}`);
  }
  
  // 验证类型值
  if (!Object.values(WorkflowTypeValue).includes(model.executionMode as WorkflowTypeValue)) {
    throw new Error(`无效的工作流类型: ${model.executionMode}`);
  }
  
  // 继续转换...
}
```

### 4.3 优先级3：补充执行状态字段（中优先级）

#### 4.3.1 修改 ThreadModel

```typescript
@Entity('threads')
export class ThreadModel {
  // 添加执行状态字段
  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  executionStatus!: string;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ nullable: true })
  currentStep?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp' })
  lastActivityAt!: Date;

  @Column('jsonb')
  executionContext!: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  nodeExecutions?: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  workflowState?: Record<string, unknown>;
}
```

#### 4.3.2 更新 ThreadRepository 的 toDomain 方法

```typescript
protected override toDomain(model: ThreadModel): Thread {
  const execution = ThreadExecution.fromProps({
    threadId: new ID(model.id),
    status: ThreadStatus.fromString(model.state),
    progress: model.progress,
    currentStep: model.currentStep,
    startedAt: model.startedAt ? Timestamp.create(model.startedAt) : undefined,
    completedAt: model.completedAt ? Timestamp.create(model.completedAt) : undefined,
    errorMessage: model.errorMessage,
    retryCount: model.retryCount,
    lastActivityAt: Timestamp.create(model.lastActivityAt),
    context: ExecutionContext.create(PromptContext.create('')),
    nodeExecutions: new Map(Object.entries(model.nodeExecutions || {})),
    workflowState: model.workflowState ? WorkflowState.fromProps(model.workflowState) : undefined,
  });

  return Thread.fromProps({
    // ...
    execution,
  });
}
```

### 4.4 优先级4：优化架构（低优先级）

#### 4.4.1 统一错误处理

创建统一的错误类：
```typescript
// src/infrastructure/persistence/errors/repository-error.ts
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityType: string, id: string) {
    super(`${entityType} not found: ${id}`, undefined, 'ENTITY_NOT_FOUND');
    this.name = 'EntityNotFoundError';
  }
}

export class MappingError extends RepositoryError {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message, undefined, 'MAPPING_ERROR');
    this.name = 'MappingError';
  }
}
```

#### 4.4.2 添加事务支持

在 BaseRepository 中添加：
```typescript
async executeInTransaction<T>(
  callback: (entityManager: EntityManager) => Promise<T>
): Promise<T> {
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
    throw new RepositoryError('Transaction failed', error as Error, 'TRANSACTION_ERROR');
  } finally {
    await queryRunner.release();
  }
}
```

#### 4.4.3 添加缓存支持

在 BaseRepository 中添加：
```typescript
private cache = new Map<string, { data: T; expiresAt: number }>();

async findByIdWithCache(id: TId, ttl: number = 60000): Promise<T | null> {
  const cacheKey = `${this.getModelClass().name}:${id}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  const entity = await this.findById(id);
  if (entity) {
    this.cache.set(cacheKey, {
      data: entity,
      expiresAt: Date.now() + ttl,
    });
  }
  
  return entity;
}

clearCache(id?: TId): void {
  if (id) {
    this.cache.delete(`${this.getModelClass().name}:${id}`);
  } else {
    this.cache.clear();
  }
}
```

---

## 五、总结

### 5.1 完成度统计

| 模块 | 已实现 | 缺失 | 完成度 |
|------|--------|------|--------|
| Model | 8 | 6 | 57.1% |
| Repository | 8 | 6 | 57.1% |
| **总体** | **16** | **12** | **57.1%** |

### 5.2 主要问题

1. **类型安全缺失**：大量使用 `any` 类型
2. **执行状态不完整**：ThreadModel 缺少执行状态字段
3. **核心仓储缺失**：工具和LLM相关的仓储未实现
4. **错误处理不一致**：部分使用 console.error
5. **缺少事务支持**：无法保证数据一致性
6. **缺少缓存支持**：影响查询性能

### 5.3 改进路线图

#### 第一阶段（1-2周）
- [ ] 补充 ToolModel 和 ToolRepository
- [ ] 补充 LLMRequestModel 和 LLMRequestRepository
- [ ] 补充 LLMResponseModel 和 LLMResponseRepository
- [ ] 修复 ThreadModel，添加执行状态字段

#### 第二阶段（1周）
- [ ] 完善 Model 层的类型安全
- [ ] 统一错误处理机制
- [ ] 添加类型验证

#### 第三阶段（1周）
- [ ] 添加事务支持
- [ ] 添加缓存支持
- [ ] 性能优化

#### 第四阶段（1周）
- [ ] 补充 CheckpointModel 和 CheckpointRepository
- [ ] 补充 ToolExecutionModel 和 ToolExecutionRepository
- [ ] 补充 ToolResultModel 和 ToolResultRepository
- [ ] 完善文档和测试

### 5.4 预期效果

完成所有改进后，持久化层将达到：
- **完成度**: 100%
- **类型安全**: 100%
- **功能完整性**: 100%
- **性能**: 提升30-50%（通过缓存）
- **可维护性**: 显著提升

---

## 六、附录

### 6.1 状态枚举对照表

| 状态类型 | 枚举值 | 说明 |
|---------|--------|------|
| WorkflowStatus | DRAFT, ACTIVE, INACTIVE, ARCHIVED | 工作流生命周期 |
| ExecutionStatus | PENDING, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED | 执行状态 |
| ThreadStatus | PENDING, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED | 线程状态 |
| SessionStatus | ACTIVE, INACTIVE, SUSPENDED, TERMINATED | 会话状态 |

### 6.2 状态转换规则

```
WorkflowStatus:
  DRAFT → ACTIVE → INACTIVE → ARCHIVED
  ↓        ↓
  └────────┴──→ ARCHIVED

ExecutionStatus/ThreadStatus:
  PENDING → RUNNING → COMPLETED
    ↓         ↓
    └────→ PAUSED ──┘
    ↓         ↓
  CANCELLED  FAILED
```

### 6.3 参考资料

- [TypeORM Documentation](https://typeorm.io/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Value Objects](https://martinfowler.com/bliki/ValueObject.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)