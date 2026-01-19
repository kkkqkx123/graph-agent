# 工作流上下文数据结构设计方案

## 1. 设计目标

### 1.1 核心目标
- 统一管理工作流执行状态上下文和提示词上下文
- 支持不可变更新模式，每次更新返回新实例
- 提供清晰的append接口，便于各组件使用
- 保持与现有系统的兼容性

### 1.2 设计原则
- **单一职责**: 每个数据结构只负责一个明确的职责
- **不可变性**: 所有值对象不可变，更新操作返回新实例
- **类型安全**: 使用TypeScript强类型，避免any和unknown
- **可扩展性**: 支持未来功能扩展，保持接口稳定

## 2. 核心数据结构

### 2.1 WorkflowContext - 统一工作流上下文

#### 2.1.1 设计思路
WorkflowContext是统一的工作流上下文，整合执行状态、提示词历史、全局变量和元数据。采用组合模式，包含多个子上下文对象。

#### 2.1.2 数据结构框架
```typescript
// 核心属性接口
interface WorkflowContextProps {
  workflowId: string;                    // 工作流ID
  executionId: string;                   // 执行ID
  executionState: ExecutionState;        // 执行状态上下文
  promptState: PromptState;              // 提示词状态上下文
  variables: Map<string, unknown>;       // 全局变量
  metadata: Record<string, unknown>;     // 元数据
  createdAt: Date;                       // 创建时间
  updatedAt: Date;                       // 更新时间
}

// 值对象类框架
class WorkflowContext extends ValueObject<WorkflowContextProps> {
  // 创建方法
  static create(workflowId: string, executionId: string): WorkflowContext;
  
  // 从属性重建
  static fromProps(props: WorkflowContextProps): WorkflowContext;
  
  // 追加节点执行状态
  appendNodeExecution(state: NodeExecutionState): WorkflowContext;
  
  // 追加提示词历史
  appendPromptHistory(entry: PromptHistoryEntry): WorkflowContext;
  
  // 更新节点执行状态
  updateNodeExecution(nodeId: string, updates: Partial<NodeExecutionState>): WorkflowContext;
  
  // 获取执行统计
  getExecutionStatistics(): ExecutionStatistics;
  
  // 创建快照
  snapshot(): WorkflowContextSnapshot;
}
```

### 2.2 ExecutionState - 执行状态上下文

#### 2.2.1 设计思路
ExecutionState负责管理工作流执行状态，包括节点执行状态、执行历史、当前节点等信息。采用Map存储节点状态，便于快速查询。

#### 2.2.2 数据结构框架
```typescript
// 节点执行状态接口
interface NodeExecutionState {
  nodeId: string;                        // 节点ID
  status: NodeStatusValue;               // 执行状态
  startTime?: Date;                      // 开始时间
  endTime?: Date;                        // 结束时间
  executionTime?: number;                // 执行耗时（毫秒）
  error?: string;                        // 错误信息
  result?: unknown;                      // 执行结果
  metadata?: Record<string, unknown>;    // 元数据
}

// 执行状态属性接口
interface ExecutionStateProps {
  nodeExecutions: Map<string, NodeExecutionState>;  // 节点执行状态映射
  currentNodeId?: string;                           // 当前节点ID
  executedNodes: string[];                          // 已执行节点ID列表
  startTime: Date;                                  // 工作流开始时间
  endTime?: Date;                                   // 工作流结束时间
}

// 值对象类框架
class ExecutionState extends ValueObject<ExecutionStateProps> {
  // 创建初始状态
  static create(): ExecutionState;
  
  // 从属性重建
  static fromProps(props: ExecutionStateProps): ExecutionState;
  
  // 添加节点执行状态
  addNodeExecution(state: NodeExecutionState): ExecutionState;
  
  // 更新节点执行状态
  updateNodeExecution(nodeId: string, updates: Partial<NodeExecutionState>): ExecutionState;
  
  // 设置当前节点
  setCurrentNode(nodeId: string): ExecutionState;
  
  // 完成工作流执行
  complete(): ExecutionState;
  
  // 获取节点状态
  getNodeExecution(nodeId: string): NodeExecutionState | undefined;
  
  // 获取指定状态的节点列表
  getNodesByStatus(status: NodeStatusValue): string[];
  
  // 获取执行统计
  getStatistics(): {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
}
```

### 2.3 PromptState - 提示词状态上下文

#### 2.3.1 设计思路
PromptState负责管理提示词历史记录，每条记录都有唯一索引，支持按类型和角色区分。采用数组存储历史记录，保持时间顺序。

#### 2.3.2 数据结构框架
```typescript
// 提示词历史条目类型枚举
type PromptHistoryEntryType = 'input' | 'output' | 'tool_call' | 'tool_result';
type PromptHistoryEntryRole = 'user' | 'assistant' | 'system' | 'tool';

// 提示词历史条目接口
interface PromptHistoryEntry {
  index: number;                         // 唯一索引
  nodeId: string;                        // 节点ID
  type: PromptHistoryEntryType;          // 条目类型
  role: PromptHistoryEntryRole;          // 角色
  content: string;                       // 内容
  timestamp: Date;                       // 时间戳
  metadata?: Record<string, unknown>;    // 元数据
}

// 提示词状态属性接口
interface PromptStateProps {
  history: PromptHistoryEntry[];         // 历史记录数组
  template?: string;                     // 提示词模板
  nextIndex: number;                     // 下一个索引
}

// 值对象类框架
class PromptState extends ValueObject<PromptStateProps> {
  // 创建初始状态
  static create(): PromptState;
  
  // 从属性重建
  static fromProps(props: PromptStateProps): PromptState;
  
  // 添加历史条目
  addEntry(entry: Omit<PromptHistoryEntry, 'index'>): PromptState;
  
  // 批量添加历史条目
  addEntries(entries: Array<Omit<PromptHistoryEntry, 'index'>>): PromptState;
  
  // 获取历史记录
  getHistory(): PromptHistoryEntry[];
  
  // 按类型筛选历史记录
  getHistoryByType(type: PromptHistoryEntryType): PromptHistoryEntry[];
  
  // 按节点筛选历史记录
  getHistoryByNode(nodeId: string): PromptHistoryEntry[];
  
  // 获取指定索引范围的历史记录
  getHistorySlice(startIndex: number, endIndex?: number): PromptHistoryEntry[];
  
  // 设置提示词模板
  setTemplate(template: string): PromptState;
}
```

### 2.4 WorkflowContextSnapshot - 上下文快照

#### 2.4.1 设计思路
WorkflowContextSnapshot用于保存工作流执行过程中的状态快照，支持断点续传和状态恢复。包含完整的上下文信息。

#### 2.4.2 数据结构框架
```typescript
// 快照属性接口
interface WorkflowContextSnapshotProps {
  workflowId: string;                    // 工作流ID
  executionId: string;                   // 执行ID
  context: WorkflowContext;              // 上下文数据
  snapshotAt: Date;                      // 快照时间
  snapshotVersion: number;               // 快照版本
  metadata?: Record<string, unknown>;    // 快照元数据
}

// 值对象类框架
class WorkflowContextSnapshot extends ValueObject<WorkflowContextSnapshotProps> {
  // 创建快照
  static create(
    workflowId: string,
    executionId: string,
    context: WorkflowContext
  ): WorkflowContextSnapshot;
  
  // 从属性重建
  static fromProps(props: WorkflowContextSnapshotProps): WorkflowContextSnapshot;
  
  // 获取快照数据
  getContext(): WorkflowContext;
  
  // 获取快照时间
  getSnapshotTime(): Date;
  
  // 获取快照版本
  getVersion(): number;
}
```

## 3. 关键设计决策

### 3.1 不可变更新模式

#### 3.1.1 设计原则
- 所有值对象不可变，更新操作返回新实例
- 使用结构共享优化性能，避免深拷贝
- 保持接口简洁，隐藏不可变性实现细节

#### 3.1.2 更新流程
```
原始上下文 → 更新操作 → 新上下文
     ↓                           ↓
  保持不变                  包含更新后的数据
```

### 3.2 索引机制设计

#### 3.2.1 提示词历史索引
- 使用自增整数作为索引，保证唯一性和顺序性
- 索引从0开始，每次添加条目自动递增
- 支持基于索引的范围查询和截取

#### 3.2.2 节点执行状态索引
- 使用节点ID作为Map的key，保证快速查找
- 节点ID为字符串类型，兼容各种节点标识方式
- 支持批量查询和状态筛选

### 3.3 类型安全设计

#### 3.3.1 枚举类型
- 使用字符串字面量类型定义状态值，避免魔法字符串
- 提供类型守卫函数，确保运行时类型安全
- 所有枚举值集中定义，便于维护和扩展

#### 3.3.2 泛型支持
- 全局变量使用unknown类型，但提供泛型访问方法
- 执行结果支持泛型参数，允许调用方指定具体类型
- 元数据使用Record<string, unknown>，保持灵活性

## 4. 接口设计

### 4.1 Append接口设计

#### 4.1.1 节点执行状态追加
```typescript
interface WorkflowContext {
  // 追加节点执行状态
  appendNodeExecution(state: NodeExecutionState): WorkflowContext;
}

// 使用示例
const newContext = context.appendNodeExecution({
  nodeId: 'node-001',
  status: 'running',
  startTime: new Date()
});
```

#### 4.1.2 提示词历史追加
```typescript
interface WorkflowContext {
  // 追加提示词历史记录
  appendPromptHistory(entry: Omit<PromptHistoryEntry, 'index'>): WorkflowContext;
}

// 使用示例
const newContext = context.appendPromptHistory({
  nodeId: 'llm-node-001',
  type: 'input',
  role: 'user',
  content: 'Hello, world!',
  timestamp: new Date()
});
```

### 4.2 查询接口设计

#### 4.2.1 节点状态查询
```typescript
interface ExecutionState {
  // 获取节点执行状态
  getNodeExecution(nodeId: string): NodeExecutionState | undefined;
  
  // 获取指定状态的节点列表
  getNodesByStatus(status: NodeStatusValue): string[];
}
```

#### 4.2.2 提示词历史查询
```typescript
interface PromptState {
  // 按类型筛选历史记录
  getHistoryByType(type: PromptHistoryEntryType): PromptHistoryEntry[];
  
  // 按节点筛选历史记录
  getHistoryByNode(nodeId: string): PromptHistoryEntry[];
  
  // 获取指定索引范围的历史记录
  getHistorySlice(startIndex: number, endIndex?: number): PromptHistoryEntry[];
}
```

## 5. 与现有系统的关系

### 5.1 兼容性设计

#### 5.1.1 与ExecutionContext的关系
- WorkflowContext将替代ExecutionContext作为主要的上下文对象
- 提供转换方法，支持从ExecutionContext迁移
- 保持过渡期内的双向兼容性

#### 5.1.2 与ThreadWorkflowState的关系
- WorkflowContext专注于workflow域，ThreadWorkflowState专注于threads域
- 通过明确的接口进行数据交换
- 避免域间耦合，保持边界清晰

#### 5.1.3 与PromptContext的关系
- PromptState将替代PromptContext管理提示词历史
- PromptContext可作为遗留接口保留，内部委托给PromptState
- 逐步迁移现有代码，降低迁移风险

### 5.2 迁移策略

#### 5.2.1 分阶段迁移
- 第一阶段：创建新的WorkflowContext和相关类型
- 第二阶段：在新功能中使用WorkflowContext
- 第三阶段：逐步迁移现有功能
- 第四阶段：废弃旧的上下文类型

#### 5.2.2 双轨运行
- 新旧上下文系统同时运行一段时间
- 提供同步机制，保持数据一致性
- 监控性能和稳定性，确保平滑过渡
