# 工作流上下文目录结构设计

## 1. 设计原则

### 1.1 分层组织原则
- **按功能模块分层**: 将不同类型的值对象按功能模块组织
- **保持扁平化**: 避免过深的目录层级，便于查找和维护
- **遵循现有规范**: 与现有目录结构保持一致性
- **域边界清晰**: 确保workflow域的上下文定义独立完整

### 1.2 命名规范
- **目录名**: 使用小写字母，多个单词用连字符连接
- **文件名**: 使用小写字母，多个单词用连字符连接
- **导出索引**: 每个目录提供index.ts统一导出

## 2. 目录结构设计

### 2.1 总体结构

```
src/domain/workflow/
├── value-objects/
│   ├── context/                      # 上下文相关值对象
│   │   ├── index.ts                  # 统一导出
│   │   ├── workflow-context.ts       # 统一工作流上下文
│   │   ├── execution-state.ts        # 执行状态上下文
│   │   ├── prompt-state.ts           # 提示词状态上下文
│   │   ├── node-execution-state.ts   # 节点执行状态
│   │   ├── prompt-history-entry.ts   # 提示词历史条目
│   │   └── workflow-context-snapshot.ts # 上下文快照
│   │
│   ├── execution/                    # 执行相关值对象（已有）
│   │   ├── index.ts
│   │   ├── execution-history.ts
│   │   ├── execution-mode.ts
│   │   ├── execution-status.ts
│   │   └── execution-strategy.ts
│   │
│   ├── node/                         # 节点相关值对象（已有）
│   │   ├── index.ts
│   │   ├── node-id.ts
│   │   ├── node-status.ts
│   │   └── node-type.ts
│   │
│   ├── edge/                         # 边相关值对象（已有）
│   │   ├── index.ts
│   │   ├── edge-id.ts
│   │   ├── edge-type.ts
│   │   └── edge-value-object.ts
│   │
│   ├── hook/                         # 钩子相关值对象（已有）
│   │   ├── index.ts
│   │   ├── hook-context.ts
│   │   ├── hook-execution-result-value.ts
│   │   └── hook-point.ts
│   │
│   ├── prompt-context.ts             # 遗留的提示词上下文（逐步废弃）
│   ├── context-filter.ts             # 上下文过滤器（已有）
│   ├── edge-value-object.ts          # 边值对象（已有）
│   ├── error-handling-strategy.ts    # 错误处理策略（已有）
│   ├── function-type.ts              # 函数类型（已有）
│   ├── trigger-value-object.ts       # 触发器值对象（已有）
│   ├── workflow-config.ts            # 工作流配置（已有）
│   ├── workflow-definition.ts        # 工作流定义（已有）
│   ├── workflow-reference.ts         # 工作流引用（已有）
│   ├── workflow-status.ts            # 工作流状态（已有）
│   ├── workflow-type.ts              # 工作流类型（已有）
│   └── index.ts                      # 统一导出（已有）
```

### 2.2 context目录详细结构

#### 2.2.1 核心上下文对象
```
context/
├── index.ts                          # 统一导出所有上下文类型
├── workflow-context.ts               # 统一工作流上下文（主入口）
├── execution-state.ts                # 执行状态上下文
├── prompt-state.ts                   # 提示词状态上下文
├── node-execution-state.ts           # 节点执行状态
├── prompt-history-entry.ts           # 提示词历史条目
└── workflow-context-snapshot.ts      # 上下文快照
```

#### 2.2.2 文件职责说明

**workflow-context.ts**
- 统一工作流上下文主类
- 整合ExecutionState和PromptState
- 提供append和查询接口
- 依赖其他上下文对象

**execution-state.ts**
- 管理节点执行状态
- 维护执行历史记录
- 提供执行统计信息
- 独立无依赖（除基础值对象外）

**prompt-state.ts**
- 管理提示词历史记录
- 维护索引和类型信息
- 提供查询和筛选功能
- 独立无依赖（除基础值对象外）

**node-execution-state.ts**
- 定义节点执行状态结构
- 包含状态、时间、结果等信息
- 作为ExecutionState的组成部分
- 独立无依赖

**prompt-history-entry.ts**
- 定义提示词历史条目结构
- 包含索引、类型、角色、内容等信息
- 作为PromptState的组成部分
- 独立无依赖

**workflow-context-snapshot.ts**
- 保存上下文快照
- 支持状态恢复
- 依赖WorkflowContext

**index.ts**
- 统一导出所有上下文类型
- 提供便捷的导入路径
- 隐藏内部结构

## 3. 导出设计

### 3.1 context/index.ts 导出设计
```typescript
// 核心上下文类
export { WorkflowContext } from './workflow-context';
export { ExecutionState } from './execution-state';
export { PromptState } from './prompt-state';

// 子结构定义
export { NodeExecutionState } from './node-execution-state';
export { PromptHistoryEntry } from './prompt-history-entry';
export { WorkflowContextSnapshot } from './workflow-context-snapshot';

// 类型定义
export type { WorkflowContextProps } from './workflow-context';
export type { ExecutionStateProps } from './execution-state';
export type { PromptStateProps } from './prompt-state';
export type { NodeExecutionState as NodeExecutionStateType } from './node-execution-state';
export type { PromptHistoryEntry as PromptHistoryEntryType } from './prompt-history-entry';
export type { WorkflowContextSnapshotProps } from './workflow-context-snapshot';

// 枚举类型
export { NodeStatusValue } from '../node/node-status';
export { PromptHistoryEntryType, PromptHistoryEntryRole } from './prompt-history-entry';
```

### 3.2 value-objects/index.ts 更新
```typescript
// 已有的导出
export * from './context-filter';
export * from './edge-value-object';
export * from './error-handling-strategy';
// ... 其他已有导出

// 新增上下文导出
export * from './context/index';
```

## 4. 依赖关系设计

### 4.1 内部依赖
```
workflow-context.ts
  ├── execution-state.ts
  ├── prompt-state.ts
  └── workflow-context-snapshot.ts

execution-state.ts
  └── node-execution-state.ts

prompt-state.ts
  └── prompt-history-entry.ts

node-execution-state.ts
  └── (无依赖)

prompt-history-entry.ts
  └── (无依赖)

workflow-context-snapshot.ts
  └── workflow-context.ts
```

### 4.2 外部依赖
```
context/ 目录下的所有文件
  ├── src/domain/common/value-objects/ (ValueObject, ID, Timestamp等)
  ├── src/domain/workflow/value-objects/node/node-status.ts (NodeStatusValue)
  └── (其他基础类型)
```

## 5. 与现有代码的集成

### 5.1 逐步替换策略

#### 5.1.1 第一阶段：并行运行
- 新的WorkflowContext与旧的ExecutionContext同时存在
- 在新功能中使用WorkflowContext
- 保持旧功能不变

#### 5.1.2 第二阶段：适配器模式
- 创建适配器，将WorkflowContext转换为ExecutionContext
- 在旧代码中使用适配器访问新上下文
- 逐步迁移旧代码

#### 5.1.3 第三阶段：完全替换
- 所有代码迁移到WorkflowContext
- 废弃ExecutionContext
- 清理适配器代码

### 5.2 兼容性保证

#### 5.2.1 接口兼容
- 保持现有接口不变
- 新增接口不破坏旧接口
- 使用可选参数和默认值

#### 5.2.2 数据兼容
- 提供数据迁移工具
- 支持旧数据格式导入
- 保持数据字段命名一致

## 6. 目录结构优势

### 6.1 清晰的功能划分
- 每个文件职责单一明确
- 目录结构反映功能模块
- 便于理解和维护

### 6.2 良好的扩展性
- 新增上下文类型只需在context目录添加文件
- 不影响现有代码结构
- 易于功能扩展

### 6.3 便于测试
- 每个值对象可独立测试
- 依赖关系清晰，便于mock
- 支持单元测试和集成测试

### 6.4 符合DDD原则
- 域边界清晰（workflow域）
- 值对象不可变
- 依赖方向正确
