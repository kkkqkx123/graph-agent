# 上下文结构分析

## 1. 当前上下文结构分析

### 1.1 ExecutionContext当前结构

```typescript
interface ExecutionContextProps {
  readonly variables: Map<string, unknown>;           // 全局执行变量
  readonly promptContext: PromptContext;              // 提示词上下文
  readonly nodeContexts: Map<string, NodeContext>;    // 节点上下文映射
  readonly config: ExecutionConfig;                   // 执行配置
}
```

### 1.2 PromptContext当前结构

```typescript
interface PromptContextProps {
  template: string;                                   // 提示词模板
  variables: Map<string, unknown>;                   // 提示词变量（与ExecutionContext.variables重复）
  history: PromptHistoryEntry[];                     // 提示词历史记录
  metadata: Record<string, unknown>;                 // 提示词元数据
}
```

### 1.3 NodeContext当前结构

```typescript
interface NodeContext {
  nodeId: NodeId;                                    // 节点ID
  variables: Map<string, unknown>;                   // 节点变量（与ExecutionContext.variables重复）
  metadata: Record<string, unknown>;                 // 节点元数据
  lastAccessedAt: Timestamp;                         // 最后访问时间
}
```

### 1.4 ExecutionConfig当前结构

```typescript
interface ExecutionConfig {
  timeout?: number;                                  // 超时时间
  maxRetries?: number;                               // 最大重试次数
  retryDelay?: number;                               // 重试延迟
  enableCaching?: boolean;                           // 是否启用缓存
  enableLogging?: boolean;                           // 是否启用日志
  customSettings?: Record<string, unknown>;          // 自定义设置
}
```

## 2. 当前结构的问题

### 2.1 变量重复问题

**问题：**
- `ExecutionContext.variables` - 全局执行变量
- `PromptContext.variables` - 提示词变量
- `NodeContext.variables` - 节点变量

**影响：**
- 变量作用域不清晰
- 变量查找逻辑复杂
- 容易出现变量覆盖或冲突
- Fork/Copy时变量处理困难

### 2.2 PromptContext职责不清

**问题：**
- PromptContext既包含提示词模板，又包含变量和历史记录
- PromptContext.variables与ExecutionContext.variables重复
- PromptContext应该专注于提示词管理，不应该包含执行变量

**影响：**
- 提示词管理与执行上下文混淆
- 提示词变量与执行变量难以区分
- 提示词历史记录与执行历史记录混淆

### 2.3 NodeContext职责不清

**问题：**
- NodeContext.variables与ExecutionContext.variables重复
- NodeContext应该只包含节点级别的局部变量
- 节点执行结果应该单独管理

**影响：**
- 节点变量与全局变量难以区分
- 节点执行结果无处存储
- 节点间数据传递困难

### 2.4 ExecutionConfig不应该在上下文中

**问题：**
- ExecutionConfig是配置信息，不是上下文数据
- 配置信息应该在Thread或Workflow中，不应该在ExecutionContext中
- 配置信息不应该随上下文一起Fork/Copy

**影响：**
- 配置与上下文混淆
- Fork/Copy时配置处理不当
- 配置更新困难

## 3. 推荐的上下文结构

### 3.1 ExecutionContext（执行上下文）- 核心上下文

**职责：**
- 管理全局执行变量
- 管理节点执行结果
- 管理执行元数据

**结构：**
```typescript
interface ExecutionContextProps {
  readonly variables: Map<string, unknown>;           // 全局执行变量
  readonly nodeResults: Map<string, unknown>;         // 节点执行结果
  readonly metadata: Record<string, unknown>;         // 执行元数据
}
```

**说明：**
- `variables`: 全局执行变量，所有节点共享
- `nodeResults`: 节点执行结果，key为nodeId，value为节点输出
- `metadata`: 执行元数据，如执行时间、执行次数等

### 3.2 PromptContext（提示词上下文）- 独立的提示词管理

**职责：**
- 管理提示词模板
- 管理提示词历史记录
- 管理提示词元数据

**结构：**
```typescript
interface PromptContextProps {
  readonly template: string;                          // 提示词模板
  readonly history: PromptHistoryEntry[];             // 提示词历史记录
  readonly metadata: Record<string, unknown>;         // 提示词元数据
}
```

**说明：**
- 移除`variables`字段，提示词变量从ExecutionContext.variables获取
- `template`: 提示词模板，支持变量替换
- `history`: 提示词历史记录，记录每次提示词和响应
- `metadata`: 提示词元数据，如提示词版本、模型等

### 3.3 NodeContext（节点上下文）- 节点级别的上下文

**职责：**
- 管理节点局部变量
- 管理节点元数据
- 记录节点访问时间

**结构：**
```typescript
interface NodeContext {
  readonly nodeId: NodeId;                            // 节点ID
  readonly localVariables: Map<string, unknown>;     // 节点局部变量
  readonly metadata: Record<string, unknown>;         // 节点元数据
  readonly lastAccessedAt: Timestamp;                 // 最后访问时间
}
```

**说明：**
- `variables`改为`localVariables`，明确是节点局部变量
- 节点局部变量只在节点内部有效，不影响全局变量
- 节点执行结果存储在ExecutionContext.nodeResults中

### 3.4 ExecutionConfig（执行配置）- 独立的配置管理

**职责：**
- 管理执行配置
- 管理重试策略
- 管理缓存和日志配置

**结构：**
```typescript
interface ExecutionConfig {
  readonly timeout?: number;                          // 超时时间
  readonly maxRetries?: number;                       // 最大重试次数
  readonly retryDelay?: number;                       // 重试延迟
  readonly enableCaching?: boolean;                   // 是否启用缓存
  readonly enableLogging?: boolean;                   // 是否启用日志
  readonly customSettings?: Record<string, unknown>;  // 自定义设置
}
```

**说明：**
- ExecutionConfig不应该在ExecutionContext中
- ExecutionConfig应该在Thread或Workflow中
- ExecutionConfig不应该随上下文一起Fork/Copy

## 4. 上下文层次结构

### 4.1 变量作用域层次

```
Thread
├── ExecutionContext（全局上下文）
│   ├── variables（全局变量）
│   ├── nodeResults（节点执行结果）
│   └── metadata（执行元数据）
├── NodeContexts（节点上下文映射）
│   └── NodeContext（节点上下文）
│       ├── localVariables（节点局部变量）
│       ├── metadata（节点元数据）
│       └── lastAccessedAt（最后访问时间）
└── PromptContext（提示词上下文）
    ├── template（提示词模板）
    ├── history（提示词历史记录）
    └── metadata（提示词元数据）
```

### 4.2 变量查找顺序

```
1. 节点局部变量（NodeContext.localVariables）
2. 全局执行变量（ExecutionContext.variables）
3. 提示词变量（从ExecutionContext.variables获取）
```

### 4.3 变量写入规则

```
1. 节点局部变量：写入NodeContext.localVariables
2. 节点执行结果：写入ExecutionContext.nodeResults
3. 全局变量：写入ExecutionContext.variables
```

## 5. 上下文生命周期

### 5.1 Thread创建

```
1. 创建ExecutionContext（空）
2. 创建PromptContext（空或从Workflow继承）
3. 创建NodeContexts（空）
4. 设置ExecutionConfig（从Thread或Workflow获取）
```

### 5.2 节点执行

```
1. 创建NodeContext（如果不存在）
2. 从ExecutionContext获取全局变量
3. 从NodeContext获取局部变量
4. 执行节点逻辑
5. 将节点结果写入ExecutionContext.nodeResults
6. 更新NodeContext.lastAccessedAt
```

### 5.3 Fork操作

```
1. 复制ExecutionContext.variables（根据策略）
2. 复制ExecutionContext.nodeResults（根据策略）
3. 复制NodeContexts（根据策略）
4. 复制PromptContext（根据策略）
5. 不复制ExecutionConfig（从父Thread继承）
```

### 5.4 Copy操作

```
1. 复制ExecutionContext.variables（根据策略）
2. 复制ExecutionContext.nodeResults（根据策略）
3. 复制NodeContexts（根据策略）
4. 复制PromptContext（根据策略）
5. 复制ExecutionConfig（根据策略）
```

## 6. 实施建议

### 6.1 重构ExecutionContext

**步骤：**
1. 移除`promptContext`字段
2. 移除`config`字段
3. 添加`nodeResults`字段
4. 保留`variables`字段
5. 添加`metadata`字段

**代码：**
```typescript
interface ExecutionContextProps {
  readonly variables: Map<string, unknown>;
  readonly nodeResults: Map<string, unknown>;
  readonly metadata: Record<string, unknown>;
}
```

### 6.2 重构PromptContext

**步骤：**
1. 移除`variables`字段
2. 保留`template`字段
3. 保留`history`字段
4. 保留`metadata`字段

**代码：**
```typescript
interface PromptContextProps {
  readonly template: string;
  readonly history: PromptHistoryEntry[];
  readonly metadata: Record<string, unknown>;
}
```

### 6.3 重构NodeContext

**步骤：**
1. 将`variables`改为`localVariables`
2. 保留`nodeId`字段
3. 保留`metadata`字段
4. 保留`lastAccessedAt`字段

**代码：**
```typescript
interface NodeContext {
  readonly nodeId: NodeId;
  readonly localVariables: Map<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly lastAccessedAt: Timestamp;
}
```

### 6.4 移除ExecutionConfig

**步骤：**
1. 从ExecutionContext中移除`config`字段
2. 将ExecutionConfig添加到Thread实体
3. 将ExecutionConfig添加到Workflow实体（可选）

**代码：**
```typescript
interface ThreadProps {
  // ... 其他字段
  readonly executionConfig: ExecutionConfig;
}

interface WorkflowProps {
  // ... 其他字段
  readonly defaultExecutionConfig?: ExecutionConfig;
}
```

## 7. 总结

### 7.1 核心改进

1. **消除变量重复**：明确区分全局变量、节点局部变量、提示词变量
2. **职责清晰**：每个上下文对象职责单一，不重复
3. **配置分离**：ExecutionConfig从上下文中分离，独立管理
4. **层次清晰**：变量作用域层次清晰，查找顺序明确

### 7.2 预期效果

1. **更好的可维护性**：上下文结构清晰，易于理解和维护
2. **更好的可扩展性**：易于添加新的上下文类型
3. **更好的性能**：变量查找效率高，避免重复存储
4. **更好的可测试性**：上下文对象职责单一，易于测试

### 7.3 实施优先级

**高优先级：**
1. 重构ExecutionContext（移除promptContext和config）
2. 重构PromptContext（移除variables）
3. 重构NodeContext（variables改为localVariables）

**中优先级：**
4. 将ExecutionConfig添加到Thread实体
5. 更新Fork/Copy策略
6. 更新ThreadRepository序列化逻辑

**低优先级：**
7. 添加变量查找优化
8. 添加上下文验证
9. 添加上下文监控