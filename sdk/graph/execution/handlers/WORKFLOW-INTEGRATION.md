# Hook和Trigger与Workflow集成设计文档

## 概述

本文档说明如何将Hook和Trigger集成到Workflow的静态定义中，以提供完整的静态检查和更好的类型安全性。

## 当前状态

### Hook（已集成）

Hook已经与节点一起定义在workflow中：

```typescript
interface Node {
  id: ID;
  type: NodeType;
  hooks?: NodeHook[];  // ✅ Hook已集成到节点定义中
}
```

### Trigger（未集成）

Trigger目前是独立管理的，通过TriggerManager动态注册：

```typescript
// 当前方式：运行时注册
const triggerManager = new TriggerManager();
triggerManager.register(trigger);
```

## 设计目标

1. **静态定义**：Trigger应该在workflow定义中声明
2. **类型安全**：提供完整的TypeScript类型检查
3. **生命周期管理**：Trigger与workflow一起创建、更新、删除
4. **向后兼容**：保持现有API的兼容性

## 设计方案

### 1. 扩展WorkflowDefinition

在[`WorkflowDefinition`](../../types/workflow.ts:189)中添加triggers字段：

```typescript
export interface WorkflowDefinition {
  id: ID;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  variables?: WorkflowVariable[];
  triggers?: WorkflowTrigger[];  // ✅ 新增：workflow级别的trigger定义
  config?: WorkflowConfig;
  metadata?: WorkflowMetadata;
  version: Version;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. 定义WorkflowTrigger类型

创建专门的workflow trigger类型，与运行时的Trigger类型区分：

```typescript
/**
 * Workflow触发器定义
 * 在workflow定义阶段声明，用于静态检查和类型安全
 */
export interface WorkflowTrigger {
  /** 触发器唯一标识符 */
  id: ID;
  /** 触发器名称 */
  name: string;
  /** 触发器描述 */
  description?: string;
  /** 触发条件 */
  condition: TriggerCondition;
  /** 触发动作 */
  action: TriggerAction;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 触发次数限制（0表示无限制） */
  maxTriggers?: number;
  /** 触发器元数据 */
  metadata?: Metadata;
}
```

**与Trigger的区别**：
- `WorkflowTrigger`：静态定义，用于workflow配置
- `Trigger`：运行时实例，包含状态信息（status、triggerCount、createdAt、updatedAt）

### 3. WorkflowTrigger到Trigger的转换

在workflow加载时，将`WorkflowTrigger`转换为`Trigger`：

```typescript
/**
 * 将WorkflowTrigger转换为Trigger
 */
export function convertToTrigger(
  workflowTrigger: WorkflowTrigger,
  workflowId: ID
): Trigger {
  return {
    id: workflowTrigger.id,
    name: workflowTrigger.name,
    description: workflowTrigger.description,
    type: TriggerType.EVENT,
    condition: workflowTrigger.condition,
    action: workflowTrigger.action,
    status: workflowTrigger.enabled !== false ? TriggerStatus.ENABLED : TriggerStatus.DISABLED,
    workflowId: workflowId,
    maxTriggers: workflowTrigger.maxTriggers,
    triggerCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: workflowTrigger.metadata
  };
}
```

### 4. 静态检查机制

#### Hook的静态检查

Hook已经在节点定义中，天然支持静态检查：

```typescript
const node: Node = {
  id: 'node-1',
  type: NodeType.LLM,
  hooks: [
    {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'node.completed',
      eventPayload: {
        notificationType: 'email'
      }
    }
  ]
};
```

#### Trigger的静态检查

通过在workflow定义中声明trigger，提供静态检查：

```typescript
const workflow: WorkflowDefinition = {
  id: 'workflow-1',
  name: 'My Workflow',
  nodes: [...],
  edges: [...],
  triggers: [
    {
      id: 'trigger-1',
      name: 'Send Email',
      condition: {
        eventType: EventType.NODE_COMPLETED,  // TypeScript会检查eventType
        nodeName: 'node-1'
      },
      action: {
        type: TriggerActionType.SEND_NOTIFICATION,  // TypeScript会检查actionType
        parameters: {
          recipient: 'user@example.com',
          subject: 'Workflow Completed'
        }
      }
    }
  ]
};
```

### 5. 集成到WorkflowRegistry

在WorkflowRegistry中处理trigger的注册：

```typescript
export class WorkflowRegistry {
  private workflows: Map<ID, ProcessedWorkflowDefinition> = {};
  private triggerManager: TriggerManager;

  constructor(triggerManager: TriggerManager) {
    this.triggerManager = triggerManager;
  }

  /**
   * 注册workflow及其triggers
   */
  register(workflow: ProcessedWorkflowDefinition): void {
    // 注册workflow
    this.workflows.set(workflow.id, workflow);

    // 注册workflow中的triggers
    if (workflow.triggers && workflow.triggers.length > 0) {
      for (const workflowTrigger of workflow.triggers) {
        const trigger = convertToTrigger(workflowTrigger, workflow.id);
        this.triggerManager.register(trigger);
      }
    }
  }

  /**
   * 注销workflow及其triggers
   */
  unregister(workflowId: ID): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return;
    }

    // 注销workflow中的triggers
    if (workflow.triggers && workflow.triggers.length > 0) {
      for (const workflowTrigger of workflow.triggers) {
        this.triggerManager.unregister(workflowTrigger.id);
      }
    }

    // 注销workflow
    this.workflows.delete(workflowId);
  }
}
```

### 6. Hook和Trigger的对比

| 特性 | Hook | Trigger |
|------|------|---------|
| **定义位置** | Node.hooks | WorkflowDefinition.triggers |
| **作用范围** | 节点级别 | 工作流级别 |
| **触发时机** | 节点执行前后 | 事件发生时 |
| **静态检查** | ✅ 已支持 | ✅ 本设计支持 |
| **生命周期** | 与节点一致 | 与workflow一致 |
| **处理器注册** | 运行时注册 | 运行时注册 |

### 7. 使用示例

#### 定义包含Hook和Trigger的Workflow

```typescript
const workflow: WorkflowDefinition = {
  id: 'workflow-1',
  name: 'Order Processing Workflow',
  description: 'Process customer orders',
  nodes: [
    {
      id: 'node-1',
      type: NodeType.LLM,
      name: 'Validate Order',
      hooks: [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'order.validate',
          eventPayload: {
            validationRules: [
              {
                expression: 'variables.orderId != null',
                message: 'Order ID is required'
              }
            ]
          }
        },
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'order.validated',
          condition: 'output.valid === true',
          eventPayload: {
            notificationType: 'email',
            recipient: '{{variables.customerEmail}}'
          }
        }
      ]
    },
    {
      id: 'node-2',
      type: NodeType.CODE,
      name: 'Process Payment'
    }
  ],
  edges: [
    {
      id: 'edge-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      condition: 'output.valid === true'
    }
  ],
  triggers: [
    {
      id: 'trigger-1',
      name: 'Send Confirmation Email',
      description: 'Send confirmation email when order is completed',
      condition: {
        eventType: EventType.NODE_COMPLETED,
        nodeName: 'node-2'
      },
      action: {
        type: TriggerActionType.SEND_NOTIFICATION,
        parameters: {
          recipient: '{{variables.customerEmail}}',
          subject: 'Order Confirmation',
          message: 'Your order has been processed successfully'
        }
      },
      enabled: true
    },
    {
      id: 'trigger-2',
      name: 'Handle Payment Failure',
      description: 'Handle payment failure',
      condition: {
        eventType: EventType.NODE_FAILED,
        nodeName: 'node-2'
      },
      action: {
        type: TriggerActionType.SET_VARIABLE,
        parameters: {
          variables: {
            orderStatus: 'FAILED',
            failureReason: 'Payment failed'
          }
        }
      },
      enabled: true
    }
  ],
  variables: [
    {
      name: 'orderId',
      type: 'string',
      required: true
    },
    {
      name: 'customerEmail',
      type: 'string',
      required: true
    }
  ]
};
```

#### 注册Workflow

```typescript
const workflowRegistry = new WorkflowRegistry(triggerManager);
workflowRegistry.register(workflow);
```

#### 执行Workflow

```typescript
const thread = await threadExecutor.execute(workflow.id, {
  orderId: 'ORD-001',
  customerEmail: 'customer@example.com'
});
```

## 实现步骤

### 阶段1：类型定义
1. 在`types/workflow.ts`中添加`triggers`字段到`WorkflowDefinition`
2. 在`types/trigger.ts`中添加`WorkflowTrigger`类型
3. 添加`convertToTrigger`转换函数

### 阶段2：WorkflowRegistry集成
1. 修改`WorkflowRegistry`的`register`方法，自动注册triggers
2. 修改`WorkflowRegistry`的`unregister`方法，自动注销triggers
3. 添加`getWorkflowTriggers`方法

### 阶段3：验证和测试
1. 添加workflow定义的验证逻辑
2. 添加trigger定义的验证逻辑
3. 编写单元测试

### 阶段4：文档和示例
1. 更新API文档
2. 添加使用示例
3. 更新迁移指南

## 向后兼容性

### 保持现有API

```typescript
// 仍然支持运行时注册trigger
const triggerManager = new TriggerManager();
triggerManager.register(trigger);
```

### 新增静态定义方式

```typescript
// 新增：在workflow定义中声明trigger
const workflow: WorkflowDefinition = {
  // ...
  triggers: [/* ... */]
};
```

## 优势

1. **类型安全**：完整的TypeScript类型检查
2. **静态验证**：在workflow定义阶段就能发现错误
3. **生命周期管理**：Trigger与workflow一起管理
4. **版本控制**：Trigger定义随workflow一起版本化
5. **文档化**：Trigger定义即文档
6. **向后兼容**：保持现有API的兼容性

## 注意事项

1. **Trigger作用域**：WorkflowTrigger默认关联到所属workflow
2. **Trigger优先级**：WorkflowTrigger的优先级高于运行时注册的Trigger
3. **Trigger冲突**：如果ID冲突，WorkflowTrigger覆盖运行时注册的Trigger
4. **性能考虑**：Trigger注册在workflow加载时完成，不影响运行时性能