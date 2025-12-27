# Workflow Entities重构设计方案

## 概述

本方案基于[`workflow-entities-analysis.md`](plans/workflow-entities-analysis.md:1)的分析报告，采用激进的重构策略，不考虑向后兼容和数据迁移，重点优化Thread的Fork操作和目录结构设计。

## 重构原则

### 1. 不向后兼容
- 直接删除不符合设计理念的实体
- 不提供适配器或迁移工具
- 重新设计所有相关接口

### 2. 职责彻底分离
- Workflow：纯粹的图结构定义
- Thread：完整的执行状态管理
- Session：全局资源统计管理

### 3. 目录结构重组
```
src/domain/
├── workflow/           # 工作流定义层
│   ├── entities/      # 工作流相关实体
│   └── value-objects/ # 工作流值对象
├── threads/           # 线程执行层
│   ├── entities/      # 线程相关实体
│   ├── value-objects/ # 线程值对象
│   └── operations/    # 线程操作（Fork、Copy等）
├── sessions/          # 会话管理层
│   ├── entities/      # 会话相关实体
│   └── value-objects/ # 会话值对象
└── common/           # 公共组件
```

## 阶段1：彻底清理和重构（高优先级）

### 1.1 直接删除的实体

**立即删除：**
- [`execution-state.ts`](src/domain/workflow/entities/execution-state.ts:1)
- [`workflow-state.ts`](src/domain/workflow/entities/workflow-state.ts:1)
- [`node-execution-state.ts`](src/domain/workflow/entities/node-execution-state.ts:1)

**删除策略：**
- 直接删除文件，不保留任何迁移代码
- 所有依赖这些实体的代码都需要重构
- 重新设计状态管理架构

### 1.2 Workflow实体彻底简化

**简化后的Workflow职责：**
```typescript
interface Workflow {
  // 纯粹的图结构
  readonly nodes: Map<NodeId, NodeDefinition>;
  readonly edges: Map<EdgeId, EdgeDefinition>;
  
  // 业务验证
  validate(): ValidationResult;
  
  // 版本和元数据
  readonly version: Version;
  readonly metadata: WorkflowMetadata;
}
```

**移除所有执行相关属性：**
- 删除所有状态管理相关方法
- 删除所有进度跟踪相关属性
- 只保留图结构定义和验证逻辑

### 1.3 Thread实体增强

**全新的ThreadExecution设计：**
```typescript
interface ThreadExecution {
  // 执行状态
  readonly status: ThreadStatus;
  readonly progress: number;
  readonly currentStep?: string;
  
  // 节点级状态管理
  readonly nodeExecutions: Map<NodeId, NodeExecution>;
  
  // 上下文管理
  readonly context: ExecutionContext;
  
  // 操作历史
  readonly operationHistory: OperationRecord[];
  
  // Fork和Copy支持
  readonly forkInfo?: ForkInfo;
  readonly copyInfo?: CopyInfo;
}
```

## 阶段2：Thread操作体系设计（核心优先级）

### 2.1 Thread操作目录结构

```
src/domain/threads/operations/
├── base/                    # 基础操作
│   ├── thread-operation.ts  # 操作基类
│   └── operation-result.ts  # 操作结果
├── fork/                    # Fork操作
│   ├── thread-fork.ts       # Fork操作实现
│   ├── fork-context.ts      # Fork上下文
│   └── fork-strategy.ts     # Fork策略
├── copy/                    # Copy操作
│   ├── thread-copy.ts       # Copy操作实现
│   ├── copy-context.ts      # Copy上下文
│   └── copy-strategy.ts     # Copy策略
├── merge/                  # Merge操作（预留）
├── compress/               # 压缩操作（预留）
└── index.ts                # 操作导出
```

### 2.2 Fork操作详细设计

**Fork操作实体设计：**
```typescript
class ThreadForkOperation {
  // Fork操作的核心属性
  readonly forkId: ID;
  readonly parentThreadId: ID;
  readonly forkPoint: NodeId;
  readonly timestamp: Timestamp;
  readonly options: ForkOptions;
  
  // Fork操作的核心方法（领域逻辑）
  createForkContext(): ForkContext;
  validateFork(): ForkValidationResult;
  calculateContextRetention(): ContextRetentionStrategy;
}
```

**Fork上下文设计：**
```typescript
interface ForkContext {
  readonly forkId: ID;
  readonly parentThreadId: ID;
  readonly forkPoint: NodeId;
  readonly timestamp: Timestamp;
  
  // 上下文快照
  readonly variableSnapshot: Map<string, unknown>;
  readonly nodeStateSnapshot: Map<NodeId, NodeExecutionSnapshot>;
  readonly promptContextSnapshot: PromptContext;
  
  // Fork配置
  readonly options: ForkOptions;
}
```

**Fork策略值对象设计：**
```typescript
class ForkStrategy {
  // 策略配置
  readonly type: ForkStrategyType;
  readonly contextRetention: ContextRetentionType;
  readonly nodeStateHandling: NodeStateHandlingType;
  
  // 策略验证
  validate(): ForkStrategyValidationResult;
  
  // 策略计算
  calculateContextRetention(thread: Thread): ContextRetentionPlan;
}
```

### 2.3 Copy操作详细设计

**Copy操作实体设计：**
```typescript
class ThreadCopyOperation {
  // Copy操作的核心属性
  readonly copyId: ID;
  readonly sourceThreadId: ID;
  readonly timestamp: Timestamp;
  readonly options: CopyOptions;
  
  // Copy操作的核心方法（领域逻辑）
  createCopyContext(): CopyContext;
  validateCopy(): CopyValidationResult;
  calculateCopyScope(): CopyScope;
}
```

**Copy上下文设计：**
```typescript
interface CopyContext {
  readonly copyId: ID;
  readonly sourceThreadId: ID;
  readonly timestamp: Timestamp;
  
  // Copy配置
  readonly options: CopyOptions;
  
  // 复制范围
  readonly scope: CopyScope;
  
  // 关系映射
  readonly relationshipMapping: Map<ID, ID>;
}
```

### 2.4 操作结果统一设计

**操作结果接口：**
```typescript
interface OperationResult<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: OperationError;
  readonly metadata: OperationMetadata;
}

interface OperationError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}
```

## 阶段3：节点级状态管理设计

### 3.1 NodeExecution设计

**全新的NodeExecution：**
```typescript
interface NodeExecution {
  // 执行状态
  readonly nodeId: NodeId;
  readonly status: NodeStatus;
  readonly startTime?: Timestamp;
  readonly endTime?: Timestamp;
  readonly duration?: number;
  
  // 执行结果
  readonly result?: unknown;
  readonly error?: NodeExecutionError;
  
  // LLM调用记录
  readonly llmCalls: LLMCallRecord[];
  
  // 工具调用记录
  readonly toolCalls: ToolCallRecord[];
  
  // 执行步骤
  readonly executionSteps: ExecutionStep[];
  
  // 重试信息
  readonly retryInfo: RetryInfo;
}
```

### 3.2 LLM调用详细记录

**LLMCallRecord设计：**
```typescript
interface LLMCallRecord {
  readonly callId: ID;
  readonly model: string;
  readonly prompt: string;
  readonly response: string;
  
  // Token使用
  readonly tokenUsage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  
  // 成本信息
  readonly cost: number;
  readonly currency: string;
  
  // 性能指标
  readonly duration: number;
  readonly timestamp: Timestamp;
  
  // 元数据
  readonly metadata: Record<string, unknown>;
}
```

### 3.3 执行上下文设计

**ExecutionContext实体设计：**
```typescript
class ExecutionContext {
  // 上下文核心属性
  readonly variables: Map<string, unknown>;
  readonly promptContext: PromptContext;
  readonly nodeContexts: Map<NodeId, NodeContext>;
  readonly config: ExecutionConfig;
  
  // 上下文核心方法（领域逻辑）
  createSnapshot(): ContextSnapshot;
  validateVariable(key: string): ValidationResult;
  calculateMemoryUsage(): number;
}
```

## 阶段4：Session统计管理设计

### 4.1 SessionActivity彻底重构

**全新的SessionActivity：**
```typescript
interface SessionActivity {
  // 基础统计
  readonly threadCount: number;
  readonly messageCount: number;
  readonly lastActivityAt: Timestamp;
  
  // LLM使用统计
  readonly llmStatistics: LLMStatistics;
  
  // 性能统计
  readonly performance: PerformanceStatistics;
  
  // 资源监控
  readonly resourceUsage: ResourceUsage;
  
  // 操作统计
  readonly operationStatistics: OperationStatistics;
}
```

### 4.2 统计系统设计

**LLMStatistics设计：**
```typescript
interface LLMStatistics {
  readonly totalTokens: number;
  readonly totalCost: number;
  
  // 按模型统计
  readonly byModel: Map<string, ModelStatistics>;
  
  // 按时间统计
  readonly byTime: TimeSeriesStatistics;
  
  // 成本分析
  readonly costAnalysis: CostAnalysis;
}
```

**OperationStatistics设计：**
```typescript
interface OperationStatistics {
  // Fork操作统计
  readonly forkOperations: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
    readonly byStrategy: Map<string, number>;
  };
  
  // Copy操作统计
  readonly copyOperations: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
  };
  
  // 其他操作统计
  readonly otherOperations: Map<string, number>;
}
```
