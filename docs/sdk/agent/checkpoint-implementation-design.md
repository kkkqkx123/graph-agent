# Agent Loop Checkpoint 实现设计文档

## 目录

1. [架构设计](#架构设计)
2. [类型定义](#类型定义)
3. [核心组件](#核心组件)
4. [实现细节](#实现细节)
5. [集成方案](#集成方案)
6. [测试策略](#测试策略)
7. [迁移步骤](#迁移步骤)

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     AgentLoopCoordinator                      │
│  (生命周期协调：创建、执行、暂停、恢复、停止)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AgentLoopEntity                           │
│  (实体：封装执行状态、消息、变量)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐      ┌──────────────────────────────┐
│ AgentLoopExecutor │      │ AgentLoopCheckpointCoordinator│
│ (执行循环逻辑)     │      │ (检查点协调：创建、恢复)       │
└───────────────────┘      └──────────────┬───────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ CheckpointStateManager│
                              │ (状态管理：持久化、清理) │
                              └──────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │DiffCalculator    │  │DeltaRestorer     │  │ConfigResolver    │
         │(计算差异)         │  │(恢复增量)         │  │(配置解析)         │
         └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 目录结构

```
sdk/agent/
├── checkpoint/                           # 检查点模块
│   ├── agent-loop-diff-calculator.ts     # 差异计算器
│   ├── agent-loop-delta-restorer.ts      # 增量恢复器
│   ├── checkpoint-coordinator.ts         # 检查点协调器
│   ├── checkpoint-config-resolver.ts     # 配置解析器
│   ├── checkpoint-state-manager.ts       # 状态管理器
│   ├── checkpoint-utils.ts               # 工具函数
│   └── index.ts                          # 导出
├── coordinators/
│   ├── agent-loop-coordinator.ts         # Loop 协调器
│   └── checkpoint-coordinator.ts         # 检查点协调器（高层）
├── entities/
│   ├── agent-loop-entity.ts              # 实体类
│   └── agent-loop-state.ts               # 状态类
├── executors/
│   └── agent-loop-executor.ts            # 执行器
├── services/
│   └── agent-loop-registry.ts            # 注册表
└── snapshot/                             # 保留用于向后兼容
    └── agent-loop-snapshot.ts
```

## 类型定义

### 在 packages/types 中添加类型

创建 `packages/types/src/agent/checkpoint.ts`：

```typescript
/**
 * Agent Loop 检查点类型定义
 */

import type { ID, Timestamp } from '../common.js';
import type { CheckpointMetadata } from './index.js';
import type { LLMMessage, AgentLoopConfig, IterationRecord } from './index.js';
import { AgentLoopStatus } from './index.js';

/**
 * Agent Loop 检查点类型
 */
export enum AgentLoopCheckpointType {
  /** 完整检查点 */
  FULL = 'FULL',
  /** 增量检查点 */
  DELTA = 'DELTA'
}

/**
 * Agent Loop 增量数据结构
 */
export interface AgentLoopDelta {
  /** 新增的消息 */
  addedMessages?: LLMMessage[];

  /** 新增的迭代记录 */
  addedIterations?: IterationRecord[];

  /** 修改的变量 */
  modifiedVariables?: Map<string, any>;

  /** 状态变更 */
  statusChange?: {
    from: AgentLoopStatus;
    to: AgentLoopStatus;
  };

  /** 其他状态差异 */
  otherChanges?: Record<string, { from: any; to: any }>;
}

/**
 * Agent Loop 状态快照
 */
export interface AgentLoopStateSnapshot {
  status: AgentLoopStatus;
  currentIteration: number;
  toolCallCount: number;
  startTime: number | null;
  endTime: number | null;
  error: any;
  iterationHistory: IterationRecord[];
}

/**
 * Agent Loop 检查点
 */
export interface AgentLoopCheckpoint {
  /** 检查点 ID */
  id: ID;

  /** Agent Loop ID */
  agentLoopId: ID;

  /** 创建时间戳 */
  timestamp: Timestamp;

  /** 检查点类型 */
  type: AgentLoopCheckpointType;

  /** 基线检查点 ID（增量检查点需要） */
  baseCheckpointId?: ID;

  /** 前一检查点 ID（增量检查点需要） */
  previousCheckpointId?: ID;

  /** 增量数据（增量检查点使用） */
  delta?: AgentLoopDelta;

  /** 完整状态快照（完整检查点使用） */
  stateSnapshot?: AgentLoopStateSnapshot;

  /** 消息历史（完整检查点使用） */
  messages?: LLMMessage[];

  /** 变量（完整检查点使用） */
  variables?: Record<string, any>;

  /** 配置（完整检查点使用） */
  config?: AgentLoopConfig;

  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * Agent Loop 检查点配置来源
 */
export type AgentLoopCheckpointConfigSource =
  /** 迭代级配置 */
  'iteration' |
  /** Loop 级配置 */
  'loop' |
  /** 全局配置 */
  'global' |
  /** 全局禁用 */
  'disabled';

/**
 * Agent Loop 检查点配置结果
 */
export interface AgentLoopCheckpointConfigResult {
  /** 是否创建检查点 */
  shouldCreate: boolean;

  /** 检查点描述 */
  description?: string;

  /** 使用的配置来源 */
  source: AgentLoopCheckpointConfigSource;
}

/**
 * Agent Loop 检查点配置上下文
 */
export interface AgentLoopCheckpointConfigContext {
  /** 当前迭代次数 */
  currentIteration: number;

  /** 是否出错 */
  hasError?: boolean;

  /** 迭代记录 */
  iterationRecord?: IterationRecord;
}

/**
 * Agent Loop 检查点配置
 */
export interface AgentLoopCheckpointConfig {
  /** 是否启用检查点 */
  enabled?: boolean;

  /** 检查点间隔（每隔 N 次迭代创建一次） */
  interval?: number;

  /** 是否只在出错时创建 */
  onErrorOnly?: boolean;

  /** 增量存储配置 */
  deltaStorage?: {
    /** 是否启用增量存储 */
    enabled?: boolean;
    /** 基线检查点间隔 */
    baselineInterval?: number;
    /** 最大增量链长度 */
    maxDeltaChainLength?: number;
  };
}

/**
 * Agent Loop 检查点列表选项
 */
export interface AgentLoopCheckpointListOptions {
  /** Agent Loop ID */
  agentLoopId?: ID;

  /** 标签过滤 */
  tags?: string[];

  /** 限制数量 */
  limit?: number;

  /** 偏移量 */
  offset?: number;
}
```

更新 `packages/types/src/agent/index.ts`：

```typescript
export * from './checkpoint.js';
export * from './index.js';
```

## 核心组件

### 1. AgentLoopDiffCalculator

**职责：** 计算两个快照之间的差异

```typescript
class AgentLoopDiffCalculator {
  calculateDelta(
    previous: AgentLoopStateSnapshot,
    current: AgentLoopStateSnapshot,
    previousMessageCount: number,
    currentMessages: LLMMessage[]
  ): AgentLoopDelta
}
```

**实现要点：**
- 消息差异：只返回新增消息（假设消息只追加）
- 迭代差异：只返回新增迭代记录
- 状态差异：记录状态变更
- 变量差异：记录修改的变量

### 2. AgentLoopDeltaRestorer

**职责：** 从增量检查点恢复完整状态

```typescript
class AgentLoopDeltaRestorer {
  async restore(checkpointId: string): Promise<FullCheckpointData>

  private async restoreDeltaCheckpoint(checkpoint: AgentLoopCheckpoint)

  private async findBaseCheckpoint(checkpoint: AgentLoopCheckpoint)

  private async buildDeltaChain(baseId: string, targetId: string)

  private applyDelta(state: FullCheckpointData, delta: AgentLoopDelta)
}
```

**实现要点：**
- 查找基线检查点
- 构建增量链
- 依次应用增量
- 降级机制：无法恢复时返回错误

### 3. AgentLoopCheckpointCoordinator

**职责：** 协调检查点的创建和恢复

```typescript
class AgentLoopCheckpointCoordinator {
  static async createCheckpoint(
    entity: AgentLoopEntity,
    dependencies: CheckpointDependencies,
    options?: CheckpointOptions
  ): Promise<string>

  static async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<AgentLoopEntity>

  private static extractState(entity: AgentLoopEntity)

  private static determineCheckpointType(
    count: number,
    config: DeltaStorageConfig
  ): AgentLoopCheckpointType

  private static createFullCheckpoint(...)

  private static createDeltaCheckpoint(...)
}
```

**实现要点：**
- 无状态设计
- 提取当前状态
- 决定检查点类型
- 创建完整或增量检查点
- 协调恢复流程

### 4. AgentLoopCheckpointResolver

**职责：** 解析检查点配置

```typescript
class AgentLoopCheckpointResolver extends CheckpointConfigResolver {
  resolveAgentConfig(
    globalConfig: AgentLoopCheckpointConfig,
    loopConfig: AgentLoopCheckpointConfig,
    context: AgentLoopCheckpointConfigContext
  ): AgentLoopCheckpointConfigResult

  private shouldCreateAtIteration(
    enabled: boolean,
    interval: number,
    currentIteration: number
  ): boolean
}
```

**实现要点：**
- 继承 `CheckpointConfigResolver`
- 支持多层级配置
- 灵活的间隔策略
- 出错时强制创建

### 5. AgentLoopCheckpointStateManager

**职责：** 管理检查点的持久化和清理

```typescript
class AgentLoopCheckpointStateManager implements LifecycleCapable<void> {
  constructor(
    storageCallback: CheckpointStorageCallback,
    eventManager?: EventManager
  )

  async create(checkpoint: AgentLoopCheckpoint): Promise<string>

  async get(checkpointId: string): Promise<AgentLoopCheckpoint | null>

  async list(options?: AgentLoopCheckpointListOptions): Promise<string[]>

  async delete(checkpointId: string): Promise<void>

  setCleanupPolicy(policy: CleanupPolicy): void

  async executeCleanup(): Promise<CleanupResult>

  async cleanupAgentLoop(agentLoopId: string): Promise<number>
}
```

**实现要点：**
- 实现有状态管理
- 支持清理策略
- 触发事件
- 错误处理

## 实现细节

### 增量计算逻辑

```typescript
calculateDelta(
  previous: AgentLoopStateSnapshot,
  current: AgentLoopStateSnapshot,
  previousMessageCount: number,
  currentMessages: LLMMessage[]
): AgentLoopDelta {
  const delta: AgentLoopDelta = {};

  // 1. 计算消息增量（只返回新增消息）
  if (currentMessages.length > previousMessageCount) {
    delta.addedMessages = currentMessages.slice(previousMessageCount);
  }

  // 2. 计算迭代增量（只返回新增迭代）
  if (current.iterationHistory.length > previous.iterationHistory.length) {
    delta.addedIterations = current.iterationHistory.slice(
      previous.iterationHistory.length
    );
  }

  // 3. 计算状态变更
  if (previous.status !== current.status) {
    delta.statusChange = {
      from: previous.status,
      to: current.status
    };
  }

  return delta;
}
```

### 检查点类型决策

```typescript
determineCheckpointType(
  checkpointCount: number,
  config: DeltaStorageConfig
): AgentLoopCheckpointType {
  // 如果未启用增量存储，始终创建完整检查点
  if (!config.enabled) {
    return AgentLoopCheckpointType.FULL;
  }

  // 第一个检查点必须是完整检查点
  if (checkpointCount === 0) {
    return AgentLoopCheckpointType.FULL;
  }

  // 每隔 baselineInterval 个检查点创建一个完整检查点
  if (checkpointCount % config.baselineInterval === 0) {
    return AgentLoopCheckpointType.FULL;
  }

  // 其他情况创建增量检查点
  return AgentLoopCheckpointType.DELTA;
}
```

### 增量恢复逻辑

```typescript
async restore(checkpointId: string): Promise<FullCheckpointData> {
  const checkpoint = await this.checkpointStateManager.get(checkpointId);

  // 如果是完整检查点，直接返回
  if (!checkpoint || checkpoint.type === AgentLoopCheckpointType.FULL) {
    return this.extractFullCheckpoint(checkpoint!);
  }

  // 如果是增量检查点，需要链式恢复
  return this.restoreDeltaCheckpoint(checkpoint);
}

private async restoreDeltaCheckpoint(
  deltaCheckpoint: AgentLoopCheckpoint
): Promise<FullCheckpointData> {
  // 1. 找到基线检查点
  const baseCheckpoint = await this.findBaseCheckpoint(deltaCheckpoint);

  // 2. 构建增量链
  const deltaChain = await this.buildDeltaChain(
    baseCheckpoint.id,
    deltaCheckpoint.id
  );

  // 3. 依次应用增量
  let result = this.extractFullCheckpoint(baseCheckpoint);
  for (const delta of deltaChain) {
    result = this.applyDelta(result, delta);
  }

  return result;
}
```

### 配置解析逻辑

```typescript
resolveAgentConfig(
  globalConfig: AgentLoopCheckpointConfig,
  loopConfig: AgentLoopCheckpointConfig,
  context: AgentLoopCheckpointConfigContext
): AgentLoopCheckpointConfigResult {
  const layers: ConfigLayer[] = [];

  // 1. Loop 配置（最高优先级）
  if (loopConfig.enabled !== undefined) {
    const shouldCreate = this.shouldCreateAtIteration(
      loopConfig.enabled,
      loopConfig.interval,
      context.currentIteration
    );
    layers.push(
      this.createLayer('loop', 100, {
        enabled: shouldCreate,
        description: `Loop checkpoint at iteration ${context.currentIteration}`
      })
    );
  }

  // 2. 全局配置
  if (globalConfig.enabled !== undefined) {
    // 如果配置了 onErrorOnly，只在出错时创建
    if (!globalConfig.onErrorOnly || context.hasError) {
      const shouldCreate = this.shouldCreateAtIteration(
        globalConfig.enabled,
        globalConfig.interval,
        context.currentIteration
      );
      layers.push(
        this.createLayer('global', 10, {
          enabled: shouldCreate,
          description: `Global checkpoint at iteration ${context.currentIteration}`
        })
      );
    }
  }

  return this.resolve(layers) as AgentLoopCheckpointConfigResult;
}
```

## 集成方案

### 修改 AgentLoopEntity

```typescript
export class AgentLoopEntity {
  // ... 现有代码 ...

  /**
   * 创建检查点（替代 createSnapshot）
   */
  async createCheckpoint(
    dependencies: CheckpointDependencies,
    options?: CheckpointOptions
  ): Promise<string> {
    return AgentLoopCheckpointCoordinator.createCheckpoint(
      this,
      dependencies,
      options
    );
  }

  /**
   * 从检查点恢复（替代 fromSnapshot）
   */
  static async fromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<AgentLoopEntity> {
    return AgentLoopCheckpointCoordinator.restoreFromCheckpoint(
      checkpointId,
      dependencies
    );
  }

  // 保留 createSnapshot 和 fromSnapshot 以向后兼容
  createSnapshot(): AgentLoopEntitySnapshot {
    // 调用新的 checkpoint 系统
    return AgentLoopSnapshotManager.createSnapshot({
      id: this.id,
      config: this.config,
      state: this.getState(),
      messages: this.messages,
      variables: this.variables,
      parentThreadId: this.parentThreadId,
      nodeId: this.nodeId,
    });
  }

  static fromSnapshot(snapshot: AgentLoopEntitySnapshot): AgentLoopEntity {
    // 保持现有实现
  }
}
```

### 修改 AgentLoopCoordinator

```typescript
export class AgentLoopCoordinator {
  constructor(
    private readonly registry: AgentLoopRegistry,
    private readonly executor: AgentLoopExecutor,
    private readonly checkpointDeps?: CheckpointDependencies
  ) {}

  async execute(
    config: AgentLoopConfig,
    options: AgentLoopExecuteOptions = {}
  ): Promise<AgentLoopResult> {
    // 1. 构建实体
    const entity = this.buildEntity(config, options);

    // 2. 注册实体
    this.registry.register(entity);

    // 3. 开始执行
    entity.state.start();

    try {
      // 4. 执行循环
      const result = await this.executor.execute(entity);

      // 5. 更新状态
      if (result.success) {
        entity.state.complete();
      } else {
        entity.state.fail(result.error);
      }

      // 6. 创建最终检查点（如果配置了）
      if (this.checkpointDeps && config.createCheckpointOnEnd !== false) {
        await entity.createCheckpoint(this.checkpointDeps, {
          metadata: {
            description: 'Final checkpoint',
            tags: ['final']
          }
        });
      }

      return result;
    } catch (error) {
      entity.state.fail(error);

      // 7. 出错时创建检查点（如果配置了）
      if (this.checkpointDeps && config.createCheckpointOnError) {
        await entity.createCheckpoint(this.checkpointDeps, {
          metadata: {
            description: 'Error checkpoint',
            tags: ['error']
          }
        });
      }

      return {
        success: false,
        iterations: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        error,
      };
    }
  }
}
```

## 测试策略

### 单元测试

#### AgentLoopDiffCalculator 测试

```typescript
describe('AgentLoopDiffCalculator', () => {
  it('should calculate message delta correctly', () => {
    const calculator = new AgentLoopDiffCalculator();
    const previous = createMockStateSnapshot();
    const current = createMockStateSnapshot();

    const delta = calculator.calculateDelta(
      previous,
      current,
      5,  // previousMessageCount
      createMockMessages(8)  // currentMessages
    );

    expect(delta.addedMessages).toHaveLength(3);
  });

  it('should calculate iteration delta correctly', () => {
    // ...
  });

  it('should calculate status change correctly', () => {
    // ...
  });
});
```

#### AgentLoopDeltaRestorer 测试

```typescript
describe('AgentLoopDeltaRestorer', () => {
  it('should restore from full checkpoint', async () => {
    // ...
  });

  it('should restore from delta checkpoint chain', async () => {
    // ...
  });

  it('should handle missing base checkpoint', async () => {
    // ...
  });
});
```

#### AgentLoopCheckpointCoordinator 测试

```typescript
describe('AgentLoopCheckpointCoordinator', () => {
  it('should create full checkpoint for first checkpoint', async () => {
    // ...
  });

  it('should create delta checkpoint for subsequent checkpoints', async () => {
    // ...
  });

  it('should create full checkpoint at baseline interval', async () => {
    // ...
  });

  it('should restore entity from checkpoint', async () => {
    // ...
  });
});
```

### 集成测试

```typescript
describe('Agent Loop Checkpoint Integration', () => {
  it('should create and restore checkpoint during execution', async () => {
    const coordinator = createCoordinator();
    const config = createTestConfig();

    const result = await coordinator.execute(config);

    const checkpoints = await listCheckpoints(result.agentLoopId);
    expect(checkpoints).toHaveLength(3);  // 假设配置了每 3 次迭代

    const restored = await restoreFromCheckpoint(checkpoints[0]);
    expect(restored.id).toBe(result.agentLoopId);
  });

  it('should create checkpoint on error', async () => {
    // ...
  });

  it('should cleanup old checkpoints', async () => {
    // ...
  });
});
```

### 性能测试

```typescript
describe('Agent Loop Checkpoint Performance', () => {
  it('should create checkpoints efficiently', async () => {
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      await createCheckpoint();
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);  // 100 次检查点在 1 秒内
  });

  it('should restore checkpoint efficiently', async () => {
    const start = Date.now();

    await restoreFromCheckpoint('checkpoint-99');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);  // 恢复在 0.5 秒内
  });
});
```

## 迁移步骤

### 阶段一：准备工作（Week 1-2）

1. **创建类型定义**
   - [ ] 在 `packages/types` 中添加 checkpoint 类型
   - [ ] 更新导出文件

2. **实现核心组件**
   - [ ] 实现 `AgentLoopDiffCalculator`
   - [ ] 实现 `AgentLoopDeltaRestorer`
   - [ ] 实现 `AgentLoopCheckpointCoordinator`
   - [ ] 实现 `AgentLoopCheckpointResolver`
   - [ ] 实现 `AgentLoopCheckpointStateManager`

3. **编写单元测试**
   - [ ] 差异计算器测试
   - [ ] 增量恢复器测试
   - [ ] 协调器测试
   - [ ] 配置解析器测试
   - [ ] 状态管理器测试

### 阶段二：集成测试（Week 3）

1. **集成到现有架构**
   - [ ] 修改 `AgentLoopEntity`
   - [ ] 修改 `AgentLoopCoordinator`
   - [ ] 修改 `AgentLoopExecutor`

2. **编写集成测试**
   - [ ] 端到端测试
   - [ ] 错误恢复测试
   - [ ] 清理策略测试

3. **性能基准测试**
   - [ ] 创建检查点性能
   - [ ] 恢复检查点性能
   - [ ] 存储空间对比

### 阶段三：渐进式迁移（Week 4-6）

1. **保留向后兼容**
   - [ ] 保留 `snapshot/` 目录
   - [ ] 标记为 @deprecated
   - [ ] 提供迁移指南

2. **迁移新功能**
   - [ ] 新代码使用 checkpoint
   - [ ] 旧代码保持不变
   - [ ] 逐步验证

3. **文档更新**
   - [ ] 更新 API 文档
   - [ ] 更新使用示例
   - [ ] 更新迁移指南

### 阶段四：完全替换（Week 7-8）

1. **全面迁移**
   - [ ] 迁移所有调用方
   - [ ] 删除 @deprecated 代码
   - [ ] 删除 `snapshot/` 目录

2. **最终测试**
   - [ ] 完整回归测试
   - [ ] 性能验证
   - [ ] 安全性测试

3. **发布**
   - [ ] 发布说明
   - [ ] 迁移指南
   - [ ] 破坏性变更通知

## 配置示例

### 最小配置

```typescript
const config = {
  checkpointEnabled: true
};
```

### 基本配置

```typescript
const config = {
  checkpointEnabled: true,
  checkpointInterval: 5  // 每 5 次迭代
};
```

### 高级配置

```typescript
const config = {
  checkpointEnabled: true,
  checkpointInterval: 5,
  checkpointOnError: true,
  deltaStorage: {
    enabled: true,
    baselineInterval: 10,
    maxDeltaChainLength: 20
  },
  cleanupPolicy: {
    type: 'count',
    maxCount: 10,
    minRetention: 2
  }
};
```

## 最佳实践

### 1. 检查点间隔选择

```typescript
// 频繁检查点（适合短时间任务）
{
  checkpointInterval: 1,  // 每次迭代
  deltaStorage: { enabled: true }
}

// 适中检查点（适合长时间任务）
{
  checkpointInterval: 5,  // 每 5 次迭代
  deltaStorage: { enabled: true, baselineInterval: 10 }
}

// 稀疏检查点（适合极长时间任务）
{
  checkpointInterval: 20,  // 每 20 次迭代
  checkpointOnError: true  // 出错时额外创建
}
```

### 2. 清理策略选择

```typescript
// 基于数量的清理（最常用）
{
  cleanupPolicy: {
    type: 'count',
    maxCount: 10,  // 最多保留 10 个
    minRetention: 2  // 最少保留 2 个
  }
}

// 基于时间的清理
{
  cleanupPolicy: {
    type: 'time',
    retentionDays: 7,  // 保留 7 天
    minRetention: 5  // 最少保留 5 个
  }
}

// 基于空间的清理
{
  cleanupPolicy: {
    type: 'size',
    maxSizeBytes: 100 * 1024 * 1024,  // 100MB
    minRetention: 3  // 最少保留 3 个
  }
}
```

### 3. 错误恢复

```typescript
const config = {
  checkpointEnabled: true,
  checkpointInterval: 10,
  checkpointOnError: true  // 出错时自动创建检查点
};

// 执行时
try {
  const result = await coordinator.execute(config);
} catch (error) {
  // 自动创建了错误检查点，可以恢复
  const checkpoints = await listCheckpoints(agentLoopId);
  const errorCheckpoint = checkpoints.find(cp =>
    cp.metadata?.tags?.includes('error')
  );
  const restored = await restoreFromCheckpoint(errorCheckpoint.id);
}
```

## 总结

本设计文档详细描述了 Agent Loop Checkpoint 的实现方案，包括：

1. **架构设计**：清晰的分层架构
2. **类型定义**：完整的类型系统
3. **核心组件**：5 个核心组件的详细设计
4. **实现细节**：关键算法的实现逻辑
5. **集成方案**：与现有架构的集成方式
6. **测试策略**：完整的测试计划
7. **迁移步骤**：8 周的渐进式迁移计划

通过这个设计，Agent Loop 将获得：
- 高效的增量快照机制
- 灵活的配置系统
- 自动清理能力
- 与 Graph 层统一的架构

预期存储效率提升 80-90%，同时保持良好的性能和向后兼容性。