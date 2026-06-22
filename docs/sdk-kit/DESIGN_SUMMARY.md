# SDK-Kit 设计思路总结

## 核心定位

**SDK-Kit 是面向新应用的高级 API 包装层**

- **不是** SDK 的替代或核心功能
- **是** SDK 之上的便利工具，降低学习曲线
- **目标** 简化 70-80% 的常见场景代码

---

## 关键设计决策

### 1. 为什么要做 Kit？

| 痛点 | SDK 方式 | Kit 方式 | 简化度 |
|------|---------|---------|--------|
| 执行工作流 | 15+ 行样板 | 3 行链式 API | 80% ↓ |
| 定义工作流 | JSON/TOML | 编程方式 | 更直观 |
| 查询执行 | 复杂 Registry API | 链式查询 | 70% ↓ |
| 错误处理 | isSuccess/getError | try-catch | 标准化 |

**结论**：Kit 为新应用提供实际价值 ✅

---

### 2. 位置：为什么在 packages/sdk-kit？

**三个备选方案对比**：

| 方案 | 优势 | 劣势 | 得分 |
|------|------|------|------|
| **packages/sdk-kit** | 分离清晰、版本独立、灵活可选 | 需要管理两个包 | ⭐⭐⭐⭐⭐ |
| sdk/kit | 地理位置靠近 | 混淆职责、版本绑定、失去灵活性 | ⭐ |
| sdk/api/kit | 强调是 API 包装 | 比方案 B 更差 | - |

**结论**：在 packages/ 是最优选择 ✅

---

### 3. 分离必要性：SDK 和 Kit 要分开吗？

**核心问题**：一般同时使用 SDK 和 Kit，为什么还要分离？

**答案**：分离 ≠ 不能同时使用

**理由**：
1. **可选性** - 性能关键应用只需 SDK，不需要 Kit 开销
2. **版本独立** - SDK bug 修复不必导致 Kit 升级
3. **职责清晰** - Kit 是包装，不是核心
4. **长期灵活** - Kit 可独立演进（如添加 CLI、UI 工具）

**最优方案**：分离 + 优化导入体验
```typescript
// Kit 重新导出 SDK，用户体验就像在同一包中
import { SDK, SDKKit } from '@wf-agent/sdk-kit';
```

**结论**：分离必要，体验可优化 ✅

---

## 高级 API 设计

### 四个核心 API

#### 1. WorkflowAPI - 工作流定义
```typescript
const template = kit.workflow()
  .create('my-workflow')
  .node('start', { type: 'START' })
  .node('task', { type: 'LLM' })
  .edge('start', 'task')
  .build();
```

**价值**：编程方式定义工作流，而不是手写 JSON

---

#### 2. ExecutionAPI - 工作流执行
```typescript
const result = await kit.execution()
  .workflow('my-workflow')
  .input({ data: '...' })
  .execute();
```

**价值**：隐藏 15 行样板代码，自动错误处理

---

#### 3. QueryAPI - 执行查询
```typescript
const results = await kit.query()
  .executions()
  .filter({ status: 'completed' })
  .limit(10)
  .get();
```

**价值**：链式查询接口，安全的过滤

---

#### 4. ErrorHandling - 统一错误
```typescript
try {
  await kit.execution().workflow('id').execute();
} catch (error) {
  if (error instanceof KitError) {
    console.error(error.code);
  }
}
```

**价值**：消除 Result 类型复杂性，使用标准异常

---

## 架构设计

### 分层架构

```
应用层 (Application Code)
         ↓
SDK-Kit 公共 API (WorkflowAPI, ExecutionAPI, QueryAPI)
         ↓
Kit 核心模块 (WorkflowBuilder, ExecutionRunner, QueryExecutor, ErrorConverter)
         ↓
SDK/API 层 (底层 API，被 Kit 内部使用)
```

### 五大核心模块

| 模块 | 职责 | 代码量 |
|------|------|--------|
| ErrorConverter | SDK 错误 → JS 异常 | ~80 行 |
| WorkflowBuilder | 编程定义工作流 | ~150 行 |
| ExecutionRunner | 简化工作流执行 | ~200 行 |
| QueryExecutor | 简化执行查询 | ~120 行 |
| SDKKit | 主入口，组织模块 | ~50 行 |

**总计**：~750 行代码（阶段 1）

---

## 实现规划

### 阶段 1：核心（2-3 周）

```
✅ ErrorConverter        → 基础错误处理
✅ 类型定义              → TypeScript 支持
✅ WorkflowBuilder       → 工作流定义
✅ ExecutionRunner       → 工作流执行
✅ QueryExecutor         → 执行查询
✅ SDKKit 主类           → 组织所有模块
✅ 单元测试              → 覆盖率 85%+
```

### 阶段 2：增强（可选）

```
- ResourceAPI           → 资源管理
- 高级查询              → filterBy, aggregate, export
- 事件系统增强          → 完整事件覆盖
```

---

## 关键架构细节

### 依赖关系

```
App Code
  ↓
Kit API (公共接口)
  ↓
Kit 核心模块
  ↓
SDK (依赖方向明确：Kit → SDK)
```

**特点**：单向依赖，无循环，清晰明确

---

### Builder 模式

```typescript
class WorkflowBuilder {
  node(id: string, config: NodeConfig): this {
    // 验证 + 添加 + 返回 this
    return this;
  }
  
  edge(from: string, to: string): this {
    // 验证 + 添加 + 返回 this
    return this;
  }
  
  build(): WorkflowTemplate {
    // 最后统一验证 + 返回结果
    this.validate();
    return this.template;
  }
}
```

**优点**：
- 链式 API 自然流畅
- 验证集中在 build 时
- 中间状态隐藏

---

### 错误转换

```typescript
class ErrorConverter {
  convertResult<T>(result: Result<T, SDKError>): T {
    if (isSuccess(result)) {
      return getSuccessData(result);  // SDK 方式
    }
    throw this.convertError(getError(result));  // 转换为异常
  }
}
```

**效果**：
- SDK 的 Result 类型 → JS 异常
- 用户只需关心 try-catch
- 错误代码统一映射

---

## 使用场景

### 场景 1：新应用快速启动

```typescript
const kit = new SDKKit(sdk);

// 定义工作流
const template = kit.workflow()
  .create('data-pipeline')
  .node('input', { type: 'START' })
  .node('process', { type: 'LLM' })
  .edge('input', 'process')
  .build();

// 执行工作流
const result = await kit.execution()
  .workflow('data-pipeline')
  .input({ data: 'test' })
  .execute();
```

✅ 代码简洁，易于上手

---

### 场景 2：需要 SDK 深度定制

```typescript
const kit = new SDKKit(sdk);

// 常规场景用 Kit
const result = await kit.execution()
  .workflow('my-wf')
  .execute();

// 特殊情况用 SDK
if (needsCustomization) {
  const deps = sdk.getFactory().getDependencies();
  const cmd = new ExecuteWorkflowCommand({...}, deps);
  const result = await sdk.executeCommand(cmd);
}
```

✅ 两种 API 可灵活切换

---

### 场景 3：性能关键应用

```typescript
// 只安装 SDK，不需要 Kit
import { SDK } from '@wf-agent/sdk';

const sdk = new SDK();
// 直接使用底层 API，没有 Kit 的开销
```

✅ 分离设计提供了灵活性

---

## 不适用的场景

| 场景 | 原因 |
|------|------|
| cli-app | 已有适配器隐藏复杂性，不需要 Kit |
| 性能关键应用 | Kit 多一层调用，直接用 SDK 更快 |
| 深度定制应用 | Kit 限制太多，直接用 SDK 更灵活 |

---

## 对标参考

### 类似的 API 包装层

| 项目 | 高级 API 层 | 定位 |
|------|-----------|------|
| **React** | Hooks API | 简化组件编写 |
| **Express** | Middleware | 简化路由处理 |
| **TypeScript** | 类型系统 | 简化 JS 开发 |
| **SDK-Kit** | 链式 API | 简化工作流编写 |

**结论**：这是业界标准做法 ✅

---

## 成功标准

### 功能完成
- ✅ 4 个核心 API 完整
- ✅ 错误处理统一
- ✅ 事件系统集成

### 代码质量
- ✅ 覆盖率 ≥ 85%
- ✅ TypeScript 无 any
- ✅ 文档完整

### 使用体验
- ✅ 学习曲线显著降低
- ✅ 代码量减少 70-80%
- ✅ 导入体验统一

---

## 后续演进

### v1.1 增强
- 高级查询功能（filterBy, aggregate）
- 完整事件系统
- 性能优化

### v1.2 扩展
- 工作流模板库
- 预构建工作流集合

### v2.0 生态
- CLI 工具集成
- UI 组件库（可选）
- 插件系统

---

## 相关文档

| 文档 | 用途 |
|------|------|
| **KIT_NECESSITY_ANALYSIS.md** | 分析 Kit 的必要性、使用场景 |
| **ARCHITECTURE_DESIGN.md** | 详细的架构设计、模块设计、交互流程 |
| **本文档** | 设计思路总结、快速参考 |

---

## 快速决策表

| 问题 | 答案 | 文档 |
|------|------|------|
| Kit 有必要吗？ | 是，为新应用降低门槛 | KIT_NECESSITY_ANALYSIS.md |
| Kit 放在哪里？ | packages/sdk-kit | ARCHITECTURE_DESIGN.md 2.1 |
| 要不要分离 SDK 和 Kit？ | 要，保持灵活性 | ARCHITECTURE_DESIGN.md 1.1 |
| 如何设计 Kit？ | 4 个核心 API | 本文档 2.0 |
| 如何实现？ | 5 大核心模块，~750 行 | ARCHITECTURE_DESIGN.md 3.0 |
| 用户如何使用？ | import { SDK, SDKKit } from '@wf-agent/sdk-kit' | 本文档 6.0 |

---

## 总结

**SDK-Kit 的本质**：

```
一个高质量的 API 包装层
         ↓
简化 80% 常见场景
         ↓
保持 100% 的灵活性
         ↓
降低新应用的学习成本
```

**核心价值**：
- ✅ 新应用可以快速启动
- ✅ 学习曲线显著降低
- ✅ 保持与 SDK 的兼容性
- ✅ 长期灵活演进

**实现方式**：
- ✅ 分离结构（packages/sdk-kit）
- ✅ 4 个核心 API
- ✅ 5 大核心模块
- ✅ ~750 行代码（阶段 1）
