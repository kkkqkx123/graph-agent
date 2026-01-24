# 异常体系迁移实施方案

## 概述

本文档详细说明了将项目中 300+ 处 `throw new Error(...)` 替换为新的异常体系的分阶段实施方案。

## 当前状态

### 已完成
- ✅ 创建新的全局异常体系（约 20 个核心异常类）
- ✅ 删除旧的异常定义文件（208 个未使用的异常类）
- ✅ 更新所有异常引用
- ✅ 类型检查通过
- ✅ 示例：[`workflow-definition.ts`](../src/domain/workflow/value-objects/workflow-definition.ts) 已完成迁移

### 待完成
- ⏳ 将 300+ 处 `throw new Error(...)` 替换为新的异常类

## 异常使用统计

根据搜索结果，`throw new Error(...)` 的使用分布如下：

| 模块 | 数量 | 优先级 | 预计工时 |
|------|------|--------|----------|
| Domain 层值对象 | ~150 | 高 | 4小时 |
| Services 层 | ~80 | 高 | 3小时 |
| Infrastructure 层 | ~50 | 中 | 2小时 |
| 其他 | ~20 | 低 | 1小时 |
| **总计** | **~300** | - | **10小时** |

## 分阶段实施方案

### 第一阶段：Domain 层值对象（高优先级）

**目标**：替换所有值对象中的验证错误

**涉及文件**：
- `src/domain/workflow/value-objects/*.ts` (~100 处)
- `src/domain/state/value-objects/*.ts` (~20 处)
- `src/domain/sessions/value-objects/*.ts` (~10 处)
- `src/domain/tools/value-objects/*.ts` (~10 处)
- `src/domain/llm/value-objects/*.ts` (~10 处)

**异常类型映射**：
- 参数验证 → `ValidationError` 或 `ParameterValidationError`
- 状态验证 → `StateValidationError`
- 配置验证 → `ConfigurationValidationError`
- 枚举值验证 → `ValidationError`

**实施步骤**：
1. 按模块逐个文件处理
2. 在文件顶部添加异常导入：`import { ValidationError } from '../../../common/exceptions';`
3. 将 `throw new Error('...')` 替换为 `throw new ValidationError('...')`
4. 运行类型检查验证
5. 提交代码

**示例**：
```typescript
// 修改前
if (!this.props.name || this.props.name.trim().length === 0) {
  throw new Error('工作流名称不能为空');
}

// 修改后
import { ValidationError } from '../../../common/exceptions';

if (!this.props.name || this.props.name.trim().length === 0) {
  throw new ValidationError('工作流名称不能为空');
}
```

**预计工时**：4小时

---

### 第二阶段：Services 层（高优先级）

**目标**：替换服务层中的业务逻辑错误

**涉及文件**：
- `src/services/workflow/*.ts` (~30 处)
- `src/services/threads/*.ts` (~30 处)
- `src/services/sessions/*.ts` (~10 处)
- `src/services/state/*.ts` (~5 处)
- `src/services/tools/*.ts` (~5 处)

**异常类型映射**：
- 实体不存在 → `EntityNotFoundError`
- 状态转换错误 → `InvalidStateTransitionError` 或 `InvalidStatusError`
- 执行错误 → `ExecutionError`、`ExecutionTimeoutError`、`ExecutionCancelledError`
- 权限错误 → `AccessDeniedError`、`AuthenticationError`
- 配置错误 → `ConfigurationError`、`MissingConfigurationError`

**实施步骤**：
1. 按模块逐个文件处理
2. 在文件顶部添加异常导入
3. 根据错误类型选择合适的异常类
4. 运行类型检查验证
5. 提交代码

**示例**：
```typescript
// 修改前
if (!workflow) {
  throw new Error(`工作流不存在: ${workflowId}`);
}

// 修改后
import { EntityNotFoundError } from '../../common/exceptions';

if (!workflow) {
  throw new EntityNotFoundError('Workflow', workflowId);
}
```

**预计工时**：3小时

---

### 第三阶段：Infrastructure 层（中优先级）

**目标**：替换基础设施层中的错误

**涉及文件**：
- `src/infrastructure/persistence/repositories/*.ts` (~15 处)
- `src/infrastructure/persistence/mappers/*.ts` (~10 处)
- `src/infrastructure/llm/*.ts` (~15 处)
- `src/infrastructure/config/*.ts` (~10 处)

**异常类型映射**：
- 配置缺失 → `MissingConfigurationError`
- 配置无效 → `InvalidConfigurationError`
- 执行错误 → `ExecutionError`
- 验证错误 → `ValidationError`

**实施步骤**：
1. 按模块逐个文件处理
2. 在文件顶部添加异常导入
3. 根据错误类型选择合适的异常类
4. 运行类型检查验证
5. 提交代码

**预计工时**：2小时

---

### 第四阶段：其他模块（低优先级）

**目标**：替换其他模块中的错误

**涉及文件**：
- `src/services/prompts/*.ts` (~10 处)
- `src/services/checkpoints/*.ts` (~5 处)
- `src/services/common/*.ts` (~5 处)

**异常类型映射**：
- 根据具体错误类型选择合适的异常类

**实施步骤**：
1. 按模块逐个文件处理
2. 在文件顶部添加异常导入
3. 根据错误类型选择合适的异常类
4. 运行类型检查验证
5. 提交代码

**预计工时**：1小时

---

## 异常类型选择指南

### ValidationError
**使用场景**：数据验证失败
```typescript
throw new ValidationError('验证失败原因');
```

### ParameterValidationError
**使用场景**：函数参数验证失败
```typescript
throw new ParameterValidationError('parameterName', '验证失败原因');
```

### StateValidationError
**使用场景**：状态验证失败
```typescript
throw new StateValidationError('状态验证失败原因');
```

### ConfigurationValidationError
**使用场景**：配置验证失败
```typescript
throw new ConfigurationValidationError('配置验证失败原因');
```

### EntityNotFoundError
**使用场景**：实体不存在
```typescript
throw new EntityNotFoundError('Workflow', workflowId);
```

### InvalidStateTransitionError
**使用场景**：不允许的状态转换
```typescript
throw new InvalidStateTransitionError('pending', 'completed');
```

### InvalidStatusError
**使用场景**：当前状态无效
```typescript
throw new InvalidStatusError('currentStatus', 'expectedStatus');
```

### ConfigurationError
**使用场景**：配置相关错误
```typescript
throw new ConfigurationError('配置错误原因');
```

### MissingConfigurationError
**使用场景**：缺少必要的配置项
```typescript
throw new MissingConfigurationError('configKey');
```

### InvalidConfigurationError
**使用场景**：配置值无效
```typescript
throw new InvalidConfigurationError('configKey', '无效原因');
```

### ExecutionError
**使用场景**：执行过程中的错误
```typescript
throw new ExecutionError('执行失败原因');
```

### ExecutionTimeoutError
**使用场景**：执行超时
```typescript
throw new ExecutionTimeoutError(timeout);
```

### ExecutionCancelledError
**使用场景**：执行被取消
```typescript
throw new ExecutionCancelledError('取消原因');
```

### AccessDeniedError
**使用场景**：访问被拒绝
```typescript
throw new AccessDeniedError('resource', 'action');
```

### AuthenticationError
**使用场景**：认证失败
```typescript
throw new AuthenticationError('认证失败原因');
```

---

## 验证方法

每个阶段完成后，执行以下验证步骤：

1. **类型检查**
```bash
tsc --noEmit
```

2. **运行测试**
```bash
npm test <相关测试文件>
```

3. **代码审查**
- 检查异常类型是否正确
- 检查错误消息是否清晰
- 检查是否需要添加上下文信息

---

## 注意事项

1. **保持向后兼容**：确保异常替换不会破坏现有功能
2. **错误消息清晰**：错误消息应该清楚地说明问题所在
3. **添加上下文**：对于复杂错误，考虑添加 context 参数
4. **渐进式迁移**：不要一次性修改太多文件，分批提交
5. **测试覆盖**：确保修改后的代码有足够的测试覆盖

---

## 进度跟踪

| 阶段 | 状态 | 完成日期 | 负责人 |
|------|------|----------|--------|
| 第一阶段：Domain 层值对象 | ⏳ 待开始 | - | - |
| 第二阶段：Services 层 | ⏳ 待开始 | - | - |
| 第三阶段：Infrastructure 层 | ⏳ 待开始 | - | - |
| 第四阶段：其他模块 | ⏳ 待开始 | - | - |

---

## 参考资料

- [异常使用分析报告](./exception-usage-analysis-report.md)
- [异常重构方案](./exception-refactoring-proposal.md)
- [全局异常体系](../src/common/exceptions/index.ts)