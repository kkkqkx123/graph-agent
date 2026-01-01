# Domain 层服务重构计划

## 问题概述

在 `src/domain/workflow/services/` 目录下存在 5 个服务文件，这些文件违反了项目的架构规则。根据 AGENTS.md 的规定：

> **Domain Layer**
> - **DOES NOT provide application services** - Services belong to Application layer only
> - **Contains only**:
>   - Entities: Workflow, Node, Edge, Tool, Session, Thread, etc.
>   - Value Objects: IDs, Status, Type, Config, Timestamp, etc.
>   - Repositories (contracts only): WorkflowRepository, ToolRepository, etc.
>   - Domain Events: Changes in entities that other layers need to know about
>   - **No services, no application orchestration logic**

## 违反架构规则的文件分析

### 1. expression-evaluator.ts

**当前位置**: `src/domain/workflow/services/expression-evaluator.ts`

**违反规则**:
- ❌ Domain 层不应包含服务
- ❌ 使用了外部技术库 `@pawel-up/jexl`（技术实现细节）
- ❌ 包含缓存机制（技术实现）
- ❌ 包含表达式验证和执行（技术实现）

**职责分析**:
- 评估表达式
- 验证表达式语法
- 提供安全的表达式执行环境
- 使用 Jexl 库，避免原型污染漏洞
- 支持表达式缓存

**应该迁移到**: `src/infrastructure/workflow/services/expression-evaluator.ts`

**理由**:
- 这是技术实现，依赖外部库 Jexl
- 包含缓存等基础设施关注点
- 不包含业务规则，只是技术工具

---

### 2. conditional-router.ts

**当前位置**: `src/domain/workflow/services/conditional-router.ts`

**违反规则**:
- ❌ Domain 层不应包含服务
- ❌ 包含路由历史记录（应用编排逻辑）
- ❌ 包含决策日志（应用服务）
- ❌ 包含路由选项和元数据（应用编排）

**职责分析**:
- 基于边的条件表达式进行路由决策
- 支持无条件边和条件边
- 支持默认边
- 支持路由历史记录
- 支持边权重和优先级
- 支持路由结果缓存

**应该迁移到**: `src/application/workflow/services/conditional-router.ts`

**理由**:
- 这是应用编排逻辑，协调工作流执行
- 包含历史记录和日志等应用服务功能
- 不包含业务规则，只是执行协调

---

### 3. history-manager.ts

**当前位置**: `src/domain/workflow/services/history-manager.ts`

**违反规则**:
- ❌ Domain 层不应包含服务
- ❌ 管理执行历史（应用编排逻辑）
- ❌ 包含统计功能（应用服务）
- ❌ 包含历史记录查询（应用服务）

**职责分析**:
- 记录工作流执行历史
- 查询执行历史
- 统计执行历史
- 线程级别的历史隔离

**应该迁移到**: `src/application/workflow/services/history-manager.ts`

**理由**:
- 这是应用服务，管理执行历史
- 包含统计和查询等应用功能
- 不包含业务规则，只是历史管理

---

### 4. state-manager.ts

**当前位置**: `src/domain/workflow/services/state-manager.ts`

**违反规则**:
- ❌ Domain 层不应包含服务
- ❌ 管理工作流执行状态（应用编排逻辑）
- ❌ 包含状态变更历史（应用服务）
- ❌ 包含状态验证（应用服务）

**职责分析**:
- 管理工作流执行状态
- 提供状态的初始化、获取、更新、清除操作
- 记录状态变更历史
- 验证状态数据
- 不可变的状态更新
- 线程级别的状态隔离

**应该迁移到**: `src/application/workflow/services/state-manager.ts`

**理由**:
- 这是应用服务，管理工作流执行状态
- 包含状态管理和验证等应用功能
- 不包含业务规则，只是状态管理

---

### 5. workflow-engine.ts

**当前位置**: `src/domain/workflow/services/workflow-engine.ts`

**违反规则**:
- ❌ Domain 层不应包含服务
- ❌ 协调工作流的执行（应用编排逻辑）
- ❌ 管理节点执行顺序（应用编排逻辑）
- ❌ 处理路由决策（应用编排逻辑）
- ❌ 管理状态和检查点（应用编排逻辑）
- ❌ 提供执行控制（应用编排逻辑）
- ❌ 处理错误和恢复（应用编排逻辑）

**职责分析**:
- 协调工作流的执行
- 管理节点执行顺序
- 处理路由决策
- 管理状态和检查点
- 提供执行控制（暂停/恢复/取消）
- 处理错误和恢复
- 支持顺序执行和条件路由
- 支持检查点和恢复
- 支持执行超时和最大步数限制

**应该迁移到**: `src/application/workflow/services/workflow-engine.ts`

**理由**:
- 这是核心应用服务，协调工作流执行
- 包含完整的执行编排逻辑
- 不包含业务规则，只是执行协调

---

## 重构方案

### 方案概述

将这 5 个服务文件从 Domain 层迁移到正确的层级：

1. **expression-evaluator.ts** → Infrastructure 层
2. **conditional-router.ts** → Application 层
3. **history-manager.ts** → Application 层
4. **state-manager.ts** → Application 层
5. **workflow-engine.ts** → Application 层

### 迁移步骤

#### 步骤 1: 创建 Application 层的 workflow 服务目录

```
src/application/workflow/
├── services/
│   ├── conditional-router.ts
│   ├── history-manager.ts
│   ├── state-manager.ts
│   └── workflow-engine.ts
└── index.ts
```

#### 步骤 2: 创建 Infrastructure 层的 expression-evaluator

```
src/infrastructure/workflow/services/
└── expression-evaluator.ts
```

#### 步骤 3: 更新依赖关系

**Application 层服务依赖**:
- `conditional-router.ts` 依赖 `expression-evaluator`（从 Infrastructure 层）
- `workflow-engine.ts` 依赖 `state-manager`, `history-manager`, `checkpoint-manager`, `conditional-router`, `node-executor`

**Infrastructure 层服务依赖**:
- `expression-evaluator.ts` 只依赖 Domain 层的值对象

#### 步骤 4: 更新导入路径

所有引用这些服务的文件需要更新导入路径：

```typescript
// 旧路径
import { ExpressionEvaluator } from '../../domain/workflow/services/expression-evaluator';
import { ConditionalRouter } from '../../domain/workflow/services/conditional-router';
import { HistoryManager } from '../../domain/workflow/services/history-manager';
import { StateManager } from '../../domain/workflow/services/state-manager';
import { WorkflowEngine } from '../../domain/workflow/services/workflow-engine';

// 新路径
import { ExpressionEvaluator } from '../../infrastructure/workflow/services/expression-evaluator';
import { ConditionalRouter } from '../../application/workflow/services/conditional-router';
import { HistoryManager } from '../../application/workflow/services/history-manager';
import { StateManager } from '../../application/workflow/services/state-manager';
import { WorkflowEngine } from '../../application/workflow/services/workflow-engine';
```

#### 步骤 5: 删除 Domain 层的 services 目录

删除 `src/domain/workflow/services/` 目录及其所有内容。

### 架构验证

重构后的架构将符合以下规则：

✅ **Domain Layer** (`src/domain/`)
- 只包含 Entities, Value Objects, Repositories (contracts), Domain Events
- 不包含任何服务
- 不包含应用编排逻辑

✅ **Application Layer** (`src/application/`)
- 包含应用服务和业务流程编排
- 依赖 Domain 层
- 协调工作流执行、状态管理、历史记录等

✅ **Infrastructure Layer** (`src/infrastructure/`)
- 包含技术实现细节
- 依赖 Domain 层
- 实现表达式评估等技术工具

### 依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│                    Interface Layer                       │
│              (HTTP API, gRPC, CLI)                      │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────┐
│                  Application Layer                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  workflow/services/                              │  │
│  │  ├── conditional-router.ts                       │  │
│  │  ├── history-manager.ts                          │  │
│  │  ├── state-manager.ts                            │  │
│  │  └── workflow-engine.ts                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────┐
│                  Domain Layer                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  workflow/                                       │  │
│  │  ├── entities/ (Workflow, Node, Edge)           │  │
│  │  ├── value-objects/ (IDs, Types, State)         │  │
│  │  ├── repositories/ (contracts only)             │  │
│  │  └── events/ (Domain Events)                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────┐
│                Infrastructure Layer                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  workflow/services/                              │  │
│  │  └── expression-evaluator.ts                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 影响范围分析

### 需要更新的文件

1. **Application 层服务**（新创建）
   - `src/application/workflow/services/conditional-router.ts`
   - `src/application/workflow/services/history-manager.ts`
   - `src/application/workflow/services/state-manager.ts`
   - `src/application/workflow/services/workflow-engine.ts`

2. **Infrastructure 层服务**（新创建）
   - `src/infrastructure/workflow/services/expression-evaluator.ts`

3. **需要更新导入的文件**
   - 所有引用这些服务的文件
   - 可能包括测试文件

4. **需要删除的文件**
   - `src/domain/workflow/services/expression-evaluator.ts`
   - `src/domain/workflow/services/conditional-router.ts`
   - `src/domain/workflow/services/history-manager.ts`
   - `src/domain/workflow/services/state-manager.ts`
   - `src/domain/workflow/services/workflow-engine.ts`

### 风险评估

**低风险**:
- 文件迁移不改变代码逻辑
- 只是调整文件位置和导入路径

**中风险**:
- 需要更新所有引用这些服务的文件
- 需要确保依赖注入配置正确

**缓解措施**:
- 使用 TypeScript 编译器检查类型错误
- 运行相关测试确保功能正常
- 分步骤迁移，每次迁移一个文件

## 执行顺序

1. ✅ 创建 `src/application/workflow/services/` 目录
2. ✅ 迁移 `conditional-router.ts` 到 Application 层
3. ✅ 迁移 `history-manager.ts` 到 Application 层
4. ✅ 迁移 `state-manager.ts` 到 Application 层
5. ✅ 迁移 `workflow-engine.ts` 到 Application 层
6. ✅ 迁移 `expression-evaluator.ts` 到 Infrastructure 层
7. ✅ 更新所有导入路径
8. ✅ 运行类型检查
9. ✅ 运行相关测试
10. ✅ 删除 Domain 层的 services 目录

## 总结

这次重构将使项目架构更加清晰和符合 DDD 原则：

- ✅ Domain 层只包含纯业务逻辑和领域定义
- ✅ Application 层包含应用服务和编排逻辑
- ✅ Infrastructure 层包含技术实现细节
- ✅ 依赖关系清晰，符合分层架构规则

重构完成后，项目将完全符合 AGENTS.md 中定义的架构规范。