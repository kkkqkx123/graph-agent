# Domain Services 移除重构指南

## 目标

根据更新后的架构规范（AGENTS.md），Domain 层**不应该提供 Services**。Domain 层只包含：
- Entities（实体）
- Value Objects（值对象）
- Repositories（仓储接口）
- Domain Events（领域事件）

所有 Services 应该在 **Application 层** 实现。

## 当前问题

### 需要删除的 Domain Services

1. **src/domain/workflow/services/domain-service.ts** - `WorkflowDomainService`
2. **src/domain/threads/services/thread-domain-service.ts** - `ThreadDomainService`
3. **src/domain/threads/services/thread-execution-service.ts** - `ThreadExecutionService`（可能需要移到Application层）
4. **src/domain/threads/checkpoints/services/thread-checkpoint-domain-service.ts** - `ThreadCheckpointDomainService`
5. **src/domain/sessions/services/session-domain-service.ts** - `SessionDomainService`
6. **src/domain/tools/services/tool-domain-service.ts** - `ToolDomainService`
7. **src/domain/history/services/** - 所有历史相关 services
8. **src/domain/checkpoint/services/checkpoint-domain-service.ts** - `CheckpointDomainService`

### 依赖关系清单

#### WorkflowDomainService
- ✅ **已完成重构** - WorkflowService
- 移除import、注入、方法调用
- 将验证方法内化为 private methods

#### ThreadDomainService (需要重构)
- `src/application/threads/services/thread-service.ts` - 使用 validateThreadCreation, validateThreadStart 等
- `src/application/threads/services/thread-lifecycle-service.ts` - 6个验证调用
- `src/application/threads/services/thread-management-service.ts` - updatePriority 验证
- `src/application/threads/services/thread-maintenance-service.ts` - 2个注释掉的调用
- `src/application/sessions/services/session-service.ts` - validateThreadCreation

#### ThreadCheckpointDomainService (需要重构)
- `src/application/threads/checkpoints/services/checkpoint-service.ts`
- `src/application/threads/checkpoints/services/checkpoint-restore-service.ts`
- `src/application/threads/checkpoints/services/checkpoint-management-service.ts`
- `src/application/threads/checkpoints/services/checkpoint-creation-service.ts`
- `src/application/threads/checkpoints/services/checkpoint-analysis-service.ts`

#### SessionDomainService (需要重构)
- `src/application/sessions/services/session-service.ts`
- `src/application/sessions/services/session-management-service.ts`
- `src/application/sessions/services/session-maintenance-service.ts`
- `src/application/sessions/services/session-lifecycle-service.ts`

## 重构步骤

### 第1步：删除所有Domain Services文件 ✅ (已完成 WorkflowDomainService)

对于每个Domain Service类：
1. 找到所有使用该Service的地方（已通过Grep完成）
2. 复制该Service中的私有方法内容
3. 在Application Service中创建对应的private方法
4. 替换所有service调用为本地方法调用
5. 删除该Service的import和DI注入
6. 删除该Service的类文件

### 第2步：删除相关export和index文件

```bash
# 删除服务文件
rm src/domain/workflow/services/domain-service.ts
rm src/domain/threads/services/thread-domain-service.ts
rm src/domain/threads/services/thread-execution-service.ts
rm src/domain/threads/checkpoints/services/thread-checkpoint-domain-service.ts
rm src/domain/sessions/services/session-domain-service.ts
rm src/domain/tools/services/tool-domain-service.ts
rm src/domain/history/services/*
rm src/domain/checkpoint/services/checkpoint-domain-service.ts

# 更新index文件
# 删除对已删除Services的export
```

### 第3步：更新DI配置

如果DI中有任何对Domain Services的注册，全部删除。Domain Services不应该被DI容器管理。

### 第4步：验证

运行 typecheck：
```bash
tsc --noEmit 2>&1 | Select-Object -First 100
```

运行相关测试：
```bash
npm test src/application/workflow/services/workflow-service
npm test src/application/threads/services/thread-service
npm test src/application/sessions/services/session-service
```

## 已完成的变更

### WorkflowService ✅
- [x] 移除 `WorkflowDomainService` import
- [x] 移除构造函数注入
- [x] 内化验证方法：
  - `validateWorkflowCreation()`
  - `validateStatusTransition()`
  - `validateExecutionEligibility()`
  - `getNextExecutionNode()`
- [x] 更新所有调用点

### 下一步工作

**待完成列表（按优先级）：**

1. **ThreadService 系列** (3个文件使用 ThreadDomainService)
   - thread-service.ts
   - thread-lifecycle-service.ts
   - thread-management-service.ts
   - thread-maintenance-service.ts

2. **CheckpointService 系列** (5个文件使用 ThreadCheckpointDomainService)
   - checkpoint-service.ts
   - checkpoint-restore-service.ts
   - checkpoint-management-service.ts
   - checkpoint-creation-service.ts
   - checkpoint-analysis-service.ts

3. **SessionService 系列** (4个文件使用 SessionDomainService)
   - session-service.ts
   - session-management-service.ts
   - session-maintenance-service.ts
   - session-lifecycle-service.ts

4. **最终清理**
   - 删除所有Domain Service文件
   - 更新index.ts exports
   - 验证无遗留依赖

## 重构模板

```typescript
// 将这个：
import { XxxDomainService } from '../../../domain/xxx/services/xxx-domain-service';

export class XxxService {
  constructor(
    private readonly xxxDomainService: XxxDomainService,
    // ...
  ) {}
  
  async someMethod() {
    await this.xxxDomainService.validateSomething();
  }
}

// 改成这样：
export class XxxService {
  constructor(
    // 移除 xxxDomainService 注入
    // ...
  ) {}
  
  async someMethod() {
    await this.validateSomething();
  }
  
  private async validateSomething(): Promise<void> {
    // 从 XxxDomainService 复制验证逻辑
  }
}
```

## 注意事项

1. **ThreadExecutionService** 需要判断：
   - 如果仅是工具方法 → 移到Application层或变成utility function
   - 如果有业务逻辑 → 仔细分析是否属于domain或application

2. **保留必要的repository调用** - 很多验证需要从仓储获取数据，这是正常的

3. **验证逻辑归类**：
   - 业务规则验证 → Application Service的private方法
   - 状态转换规则 → 可考虑放到Entity中，但通常在Application Service处理

4. **Type check** - 完成后务必确保没有编译错误
