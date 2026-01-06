# Model 层重构建议

#### 方案3：使用物化视图

```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW workflow_execution_stats AS
SELECT 
  workflowId,
  COUNT(*) as executionCount,
  SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) as successCount,
  SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failureCount,
  AVG(EXTRACT(EPOCH FROM (completedAt - startedAt))) as averageExecutionTime,
  MAX(completedAt) as lastExecutedAt
FROM threads
WHERE workflowId IS NOT NULL
GROUP BY workflowId;

-- 创建索引
CREATE INDEX ON workflow_execution_stats(workflowId);

-- 定期刷新（通过定时任务）
REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_execution_stats;
```

**优点**：
- 查询性能高
- 数据一致性好
- 无需额外代码

**缺点**：
- 需要定期刷新
- 数据不是实时的
- 增加数据库复杂度

### 1.4 建议

**✅ 推荐删除 ExecutionStatsModel**

**理由**：
1. Domain 层没有对应概念，违反 DDD 原则
2. 数据冗余，可以通过查询计算
3. 维护成本高，需要同步更新
4. 不符合单一职责原则

**替代方案**：
- **短期**：使用方案1（通过查询计算）
- **中期**：使用方案2（使用缓存）
- **长期**：使用方案3（使用物化视图）

---

## 二、Session、Workflow 的状态是否应该直接在相应模型中实现？

### 2.1 当前实现分析

#### WorkflowModel

```typescript
@Entity('workflows')
export class WorkflowModel {
  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],  // ❌ 硬编码
    default: 'draft',
  })
  state!: string;
}
```

#### SessionModel

```typescript
@Entity('sessions')
export class SessionModel {
  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'closed'],  // ❌ 硬编码
    default: 'active',
  })
  state!: string;
}
```

### 2.2 问题分析

#### 问题1：类型不安全

**使用字符串而非枚举类型**

```typescript
// ❌ 当前实现
state!: string;  // 可以是任意字符串

// ✅ 应该使用枚举
state!: WorkflowStatusValue;
```

**影响**：
- 编译时无法捕获类型错误
- IDE 无法提供智能提示
- 运行时可能出现无效值

#### 问题2：与 Domain 层不同步

**枚举值硬编码，与 Domain 层的值对象不同步**

```typescript
// ❌ Model 层硬编码
enum: ['draft', 'active', 'inactive', 'archived']

// Domain 层定义
enum WorkflowStatusValue {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}
```

**问题**：
- 如果 Domain 层修改枚举值，Model 屄不会同步
- 需要手动维护两处定义
- 容易出现不一致

#### 问题3：缺少类型验证

**没有运行时类型验证**

```typescript
// ❌ 没有验证
@Column({
  type: 'enum',
  enum: ['draft', 'active', 'inactive', 'archived'],
  default: 'draft',
})
state!: string;

// ✅ 应该添加验证
@Column({
  type: 'enum',
  enum: Object.values(WorkflowStatusValue),
  default: WorkflowStatusValue.DRAFT,
})
state!: WorkflowStatusValue;
```

### 2.3 重构方案

#### 方案1：导入 Domain 层的枚举（推荐）

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

**优点**：
- 类型安全
- 与 Domain 层同步
- IDE 提供智能提示

**缺点**：
- Infrastructure 层依赖 Domain 层（符合 DDD 原则）

#### 方案2：在 Repository 层进行类型转换

```typescript
// workflow.model.ts - 保持简单
@Entity('workflows')
export class WorkflowModel {
  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft',
  })
  state!: string;
}

// workflow-repository.ts - 在转换时验证
export class WorkflowRepository {
  protected override toDomain(model: WorkflowModel): Workflow {
    // 验证状态值
    if (!Object.values(WorkflowStatusValue).includes(model.state as WorkflowStatusValue)) {
      throw new Error(`无效的工作流状态: ${model.state}`);
    }

    const definition = WorkflowDefinition.fromProps({
      // ...
      status: WorkflowStatus.fromString(model.state),
    });

    return Workflow.fromProps({
      // ...
      definition,
    });
  }

  protected override toModel(entity: Workflow): WorkflowModel {
    const model = new WorkflowModel();
    model.state = entity.status.getValue();  // ✅ 从值对象获取
    return model;
  }
}
```

**优点**：
- Model 层保持简单
- 类型转换集中在 Repository 层
- 运行时验证

**缺点**：
- 需要在 Repository 层维护验证逻辑

#### 方案3：使用自定义列类型

```typescript
// 创建自定义列类型
import { ValueTransformer } from 'typeorm';

export class WorkflowStatusTransformer implements ValueTransformer {
  to(value: WorkflowStatusValue): string {
    return value;
  }

  from(value: string): WorkflowStatusValue {
    if (!Object.values(WorkflowStatusValue).includes(value as WorkflowStatusValue)) {
      throw new Error(`无效的工作流状态: ${value}`);
    }
    return value as WorkflowStatusValue;
  }
}

// 在 Model 中使用
@Entity('workflows')
export class WorkflowModel {
  @Column({
    type: 'enum',
    enum: Object.values(WorkflowStatusValue),
    default: WorkflowStatusValue.DRAFT,
    transformer: new WorkflowStatusTransformer(),
  })
  state!: WorkflowStatusValue;
}
```

**优点**：
- 类型转换自动化
- 运行时验证
- 代码复用

**缺点**：
- 增加复杂度
- 需要为每个枚举创建 Transformer

### 2.4 建议

**✅ 推荐使用方案1（导入 Domain 层的枚举）**

**理由**：
1. 符合 DDD 原则（Infrastructure 层可以依赖 Domain 层）
2. 类型安全，编译时检查
3. 与 Domain 层自动同步
4. 代码简洁，易于维护

**实施步骤**：

#### 步骤1：修改 WorkflowModel

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

#### 步骤2：修改 SessionModel

```typescript
// session.model.ts
import { SessionStatusValue } from '../../../domain/sessions/value-objects/session-status';

@Entity('sessions')
export class SessionModel {
  @Column({
    type: 'enum',
    enum: Object.values(SessionStatusValue),
    default: SessionStatusValue.ACTIVE,
  })
  state!: SessionStatusValue;
}
```

#### 步骤3：修改 ThreadModel

```typescript
// thread.model.ts
import { ThreadStatusValue } from '../../../domain/threads/value-objects/thread-status';

@Entity('threads')
export class ThreadModel {
  @Column({
    type: 'enum',
    enum: Object.values(ThreadStatusValue),
    default: ThreadStatusValue.PENDING,
  })
  state!: ThreadStatusValue;

  @Column({
    type: 'enum',
    enum: Object.values(ThreadStatusValue),
    default: ThreadStatusValue.PENDING,
  })
  executionStatus!: ThreadStatusValue;
}
```

#### 步骤4：更新 Repository 的 toDomain 方法

```typescript
// workflow-repository.ts
protected override toDomain(model: WorkflowModel): Workflow {
  const definition = WorkflowDefinition.fromProps({
    // ...
    status: WorkflowStatus.fromString(model.state),  // ✅ 使用值对象的工厂方法
    type: WorkflowType.fromString(model.executionMode),
  });

  return Workflow.fromProps({
    // ...
    definition,
  });
}
```

---

## 三、总结

### 3.1 ExecutionStatsModel

**✅ 应该删除**

**原因**：
1. Domain 层没有对应概念
2. 数据冗余，可以通过查询计算
3. 维护成本高
4. 不符合单一职责原则

**替代方案**：
- 短期：通过查询计算
- 中期：使用缓存
- 长期：使用物化视图

### 3.2 Session、Workflow 状态

**✅ 应该直接在相应模型中实现，但要使用 Domain 层的枚举**

**原因**：
1. 状态是实体的核心属性
2. 使用 Domain 层的枚举保证类型安全
3. 符合 DDD 原则
4. 自动同步，易于维护

**实施方式**：
```typescript
// ✅ 正确做法
import { WorkflowStatusValue } from '../../../domain/workflow/value-objects/workflow-status';

@Column({
  type: 'enum',
  enum: Object.values(WorkflowStatusValue),
  default: WorkflowStatusValue.DRAFT,
})
state!: WorkflowStatusValue;
```

### 3.3 重构优先级

| 任务 | 优先级 | 预计时间 |
|------|--------|---------|
| 删除 ExecutionStatsModel | 🔴 高 | 2小时 |
| 修改 WorkflowModel 使用枚举 | 🔴 高 | 1小时 |
| 修改 SessionModel 使用枚举 | 🔴 高 | 1小时 |
| 修改 ThreadModel 使用枚举 | 🔴 高 | 1小时 |
| 实现统计查询方法 | 🟡 中 | 4小时 |
| 添加缓存支持 | 🟢 低 | 8小时 |

**总计**：约17小时（2个工作日）

---

## 四、附录

### 4.1 状态枚举对照表

| 实体 | 枚举类型 | 枚举值 |
|------|---------|--------|
| Workflow | WorkflowStatusValue | DRAFT, ACTIVE, INACTIVE, ARCHIVED |
| Session | SessionStatusValue | ACTIVE, INACTIVE, SUSPENDED, TERMINATED |
| Thread | ThreadStatusValue | PENDING, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED |

### 4.2 迁移脚本

```sql
-- 删除 execution_stats 表
DROP TABLE IF EXISTS execution_stats;

-- 修改 workflows 表的 state 列类型（如果需要）
ALTER TABLE workflows 
  ALTER COLUMN state TYPE VARCHAR(20) 
  USING state::VARCHAR(20);

-- 添加约束
ALTER TABLE workflows 
  ADD CONSTRAINT check_workflow_state 
  CHECK (state IN ('draft', 'active', 'inactive', 'archived'));

-- 修改 sessions 表的 state 列类型（如果需要）
ALTER TABLE sessions 
  ALTER COLUMN state TYPE VARCHAR(20) 
  USING state::VARCHAR(20);

-- 添加约束
ALTER TABLE sessions 
  ADD CONSTRAINT check_session_state 
  CHECK (state IN ('active', 'inactive', 'suspended', 'terminated'));

-- 修改 threads 表的 state 列类型（如果需要）
ALTER TABLE threads 
  ALTER COLUMN state TYPE VARCHAR(20) 
  USING state::VARCHAR(20);

-- 添加约束
ALTER TABLE threads 
  ADD CONSTRAINT check_thread_state 
  CHECK (state IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled'));
```

### 4.3 参考资料

- [TypeORM Enum Column](https://typeorm.io/#/entities/column-types)
- [DDD Value Objects](https://martinfowler.com/bliki/ValueObject.html)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)