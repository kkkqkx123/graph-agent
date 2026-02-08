# SDK 检查点配置增强方案（简化版）

## 1. 设计原则调整

基于用户反馈，重新设计更简洁的检查点配置方案：

1. **检查点内容完整**：检查点始终记录完整执行状态，无需配置包含哪些内容
2. **配置简化**：移除复杂的策略配置，在现有Trigger和Hook机制中扩展
3. **函数式处理**：检查点创建使用无状态函数或协调器
4. **工具级配置**：在Tool定义中直接配置是否创建检查点

## 2. 简化后的类型设计

### 2.1 全局检查点配置

```typescript
// 简化的全局检查点配置
export interface CheckpointConfig {
  /** 是否启用检查点（全局开关） */
  enabled?: boolean;
  
  /** 是否在节点执行前创建检查点（全局默认行为） */
  checkpointBeforeNode?: boolean;
  
  /** 默认检查点元数据 */
  defaultMetadata?: CheckpointMetadata;
}
```

### 2.2 Trigger配置扩展

```typescript
// 扩展现有的 Trigger 接口
export interface Trigger {
  // ... 现有字段
  
  /** 触发时是否创建检查点 */
  createCheckpoint?: boolean;
  
  /** 检查点描述 */
  checkpointDescription?: string;
}

// 扩展现有的 TriggerTemplate 接口
export interface TriggerTemplate {
  // ... 现有字段
  
  /** 触发时是否创建检查点 */
  createCheckpoint?: boolean;
  
  /** 检查点描述模板 */
  checkpointDescriptionTemplate?: string;
}
```

### 2.3 Hook配置扩展

```typescript
// 扩展现有的 NodeHook 接口
export interface NodeHook {
  /** Hook类型 */
  hookType: HookType;
  
  /** 触发条件表达式（可选） */
  condition?: string;
  
  /** 要触发的自定义事件名称 */
  eventName: string;
  
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  
  /** 是否启用（默认true） */
  enabled?: boolean;
  
  /** 权重（数字越大优先级越高） */
  weight?: number;
  
  /** Hook触发时是否创建检查点（新增） */
  createCheckpoint?: boolean;
  
  /** 检查点描述（新增） */
  checkpointDescription?: string;
}
```

### 2.4 Tool配置扩展

```typescript
// 扩展现有的 Tool 接口
export interface Tool {
  /** 工具ID */
  id: ID;
  
  /** 工具名称 */
  name: string;
  
  /** 工具描述 */
  description?: string;
  
  /** 工具参数定义 */
  parameters?: ToolParameter[];
  
  /** 工具执行配置 */
  execution?: ToolExecutionConfig;
  
  /** 工具调用时是否创建检查点（新增） */
  createCheckpoint?: boolean | 'before' | 'after' | 'both';
  
  /** 检查点描述模板（新增） */
  checkpointDescriptionTemplate?: string;
}

// 工具执行配置
export interface ToolExecutionConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  
  /** 重试次数 */
  retryCount?: number;
  
  /** 是否需要审批 */
  requiresApproval?: boolean;
}
```

### 2.5 节点配置扩展

```typescript
// 扩展现有的 Node 接口
export interface Node {
  /** 节点唯一标识符 */
  id: ID;
  
  /** 节点类型 */
  type: NodeType;
  
  /** 节点名称 */
  name: string;
  
  /** 节点配置 */
  config: NodeConfig;
  
  /** 出边ID数组 */
  outgoingEdgeIds: ID[];
  
  /** 入边ID数组 */
  incomingEdgeIds: ID[];
  
  /** Hook配置数组 */
  hooks?: NodeHook[];
  
  /** 节点执行前是否创建检查点（新增，优先级高于全局配置） */
  checkpointBeforeExecute?: boolean;
  
  /** 节点执行后是否创建检查点（新增，优先级高于全局配置） */
  checkpointAfterExecute?: boolean;
}
```

## 3. 函数式检查点创建方法

### 3.1 核心函数定义

```typescript
// 检查点创建选项
export interface CreateCheckpointOptions {
  /** 线程ID */
  threadId: ID;
  
  /** 节点ID（可选） */
  nodeId?: ID;
  
  /** 工具名称（可选） */
  toolName?: string;
  
  /** 检查点描述 */
  description?: string;
  
  /** 自定义元数据 */
  metadata?: CheckpointMetadata;
}

// 创建检查点（函数式接口）
export async function createCheckpoint(
  options: CreateCheckpointOptions
): Promise<string> {
  // 实现逻辑：调用 CheckpointCoordinator
}

// 批量创建检查点
export async function createCheckpoints(
  optionsList: CreateCheckpointOptions[]
): Promise<string[]> {
  // 实现逻辑：批量处理
}
```

### 3.2 在Hook中创建检查点

```typescript
// Hook执行器集成
class HookExecutor {
  async executeHook(
    threadId: string,
    nodeId: string,
    hook: NodeHook,
    context: any
  ) {
    // 执行Hook逻辑前
    if (hook.createCheckpoint) {
      await createCheckpoint({
        threadId,
        nodeId,
        description: hook.checkpointDescription || `Hook: ${hook.eventName}`
      });
    }
    
    // 执行Hook逻辑...
    
    // 触发事件
    await this.eventManager.emit(hook.eventName, {
      ...hook.eventPayload,
      checkpointCreated: hook.createCheckpoint
    });
  }
}
```

### 3.3 在Trigger中创建检查点

```typescript
// Trigger执行器集成
class TriggerExecutor {
  async executeTrigger(
    threadId: string,
    trigger: Trigger,
    context: any
  ) {
    // 评估触发条件
    const shouldTrigger = await this.evaluateTriggerCondition(trigger, context);
    
    if (shouldTrigger) {
      // 触发前创建检查点
      if (trigger.createCheckpoint) {
        await createCheckpoint({
          threadId,
          description: trigger.checkpointDescription || `Trigger: ${trigger.id}`
        });
      }
      
      // 执行触发逻辑...
    }
  }
}
```

### 3.4 在Tool执行中创建检查点

```typescript
// Tool执行器集成
class ToolExecutor {
  async executeTool(
    threadId: string,
    tool: Tool,
    parameters: any
  ) {
    const checkpointConfig = tool.createCheckpoint;
    
    // 工具调用前检查点
    if (checkpointConfig === true || checkpointConfig === 'before' || checkpointConfig === 'both') {
      await createCheckpoint({
        threadId,
        toolName: tool.name,
        description: tool.checkpointDescriptionTemplate || `Before tool: ${tool.name}`
      });
    }
    
    // 执行工具调用...
    const result = await this.callTool(tool, parameters);
    
    // 工具调用后检查点
    if (checkpointConfig === 'after' || checkpointConfig === 'both') {
      await createCheckpoint({
        threadId,
        toolName: tool.name,
        description: tool.checkpointDescriptionTemplate || `After tool: ${tool.name}`
      });
    }
    
    return result;
  }
}
```

## 4. 无状态协调器方案

### 4.1 无状态CheckpointCoordinator

```typescript
// 无状态的检查点协调器
export class CheckpointCoordinator {
  /**
   * 创建检查点（无状态方法）
   */
  static async createCheckpoint(
    threadId: string,
    metadata?: CheckpointMetadata,
    dependencies: {
      threadRegistry: ThreadRegistry;
      checkpointStateManager: CheckpointStateManager;
      workflowRegistry: WorkflowRegistry;
      globalMessageStorage: GlobalMessageStorage;
    }
  ): Promise<string> {
    // 实现逻辑：不依赖实例状态
  }
  
  /**
   * 从检查点恢复（无状态方法）
   */
  static async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: {
      threadRegistry: ThreadRegistry;
      checkpointStateManager: CheckpointStateManager;
      workflowRegistry: WorkflowRegistry;
      globalMessageStorage: GlobalMessageStorage;
    }
  ): Promise<ThreadContext> {
    // 实现逻辑：不依赖实例状态
  }
}
```

### 4.2 使用示例

```typescript
// 在Hook中使用无状态协调器
class HookExecutor {
  async executeHook(
    threadId: string,
    nodeId: string,
    hook: NodeHook,
    context: any
  ) {
    if (hook.createCheckpoint) {
      const dependencies = this.getCheckpointDependencies();
      await CheckpointCoordinator.createCheckpoint(
        threadId,
        { description: `Hook: ${hook.eventName}` },
        dependencies
      );
    }
    
    // 执行Hook逻辑...
  }
  
  private getCheckpointDependencies() {
    return {
      threadRegistry: this.threadRegistry,
      checkpointStateManager: this.checkpointStateManager,
      workflowRegistry: this.workflowRegistry,
      globalMessageStorage: this.globalMessageStorage
    };
  }
}
```

## 5. 配置优先级规则

### 5.1 优先级层次

1. **节点级配置**：最高优先级
   - `node.checkpointBeforeExecute`
   - `node.checkpointAfterExecute`

2. **Hook/Trigger配置**：中优先级
   - `hook.createCheckpoint`
   - `trigger.createCheckpoint`

3. **全局配置**：最低优先级
   - `config.checkpointBeforeNode`
   - `config.checkpointAfterNode`

### 5.2 配置合并规则

```typescript
// 配置合并逻辑
function shouldCreateCheckpoint(
  globalConfig: CheckpointConfig,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  context: CheckpointContext
): boolean {
  // 1. 检查Hook配置
  if (hookConfig?.createCheckpoint !== undefined) {
    return hookConfig.createCheckpoint;
  }
  
  // 2. 检查Trigger配置
  if (triggerConfig?.createCheckpoint !== undefined) {
    return triggerConfig.createCheckpoint;
  }
  
  // 3. 检查节点配置
  if (context.triggerType === CheckpointTriggerType.NODE_BEFORE_EXECUTE) {
    if (nodeConfig?.checkpointBeforeExecute !== undefined) {
      return nodeConfig.checkpointBeforeExecute;
    }
  } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
    if (nodeConfig?.checkpointAfterExecute !== undefined) {
      return nodeConfig.checkpointAfterExecute;
    }
  }
  
  // 4. 检查全局配置
  if (context.triggerType === CheckpointTriggerType.NODE_BEFORE_EXECUTE) {
    return globalConfig.checkpointBeforeNode ?? false;
  } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
    return globalConfig.checkpointAfterNode ?? false;
  }
  
  return false;
}
```

## 6. 配置示例

### 6.1 全局配置

```json
{
  "config": {
    "enableCheckpoints": true,
    "checkpointConfig": {
      "enabled": true,
      "checkpointBeforeNode": false,
      "checkpointAfterNode": false,
      "defaultMetadata": {
        "creator": "system"
      }
    }
  }
}
```

### 6.2 节点级配置

```json
{
  "nodes": [
    {
      "id": "critical_node",
      "type": "CODE",
      "config": {
        "scriptName": "process_data",
        "scriptType": "python"
      },
      "checkpointBeforeExecute": true,
      "checkpointAfterExecute": true
    }
  ]
}
```

### 6.3 Hook配置

```json
{
  "nodes": [
    {
      "id": "llm_node",
      "type": "LLM",
      "config": {
        "profileId": "gpt-4"
      },
      "hooks": [
        {
          "hookType": "BEFORE_EXECUTE",
          "eventName": "log_node_start",
          "createCheckpoint": true,
          "checkpointDescription": "Before LLM execution"
        }
      ]
    }
  ]
}
```

### 6.4 Tool配置

```json
{
  "tools": [
    {
      "id": "database_tool",
      "name": "query_database",
      "description": "Query database",
      "createCheckpoint": "both",
      "checkpointDescriptionTemplate": "Database operation: {{tool.name}}"
    }
  ]
}
```

## 7. 向后兼容性

### 7.1 兼容策略

1. **保留`enableCheckpoints`**：现有配置继续有效
2. **新配置可选**：所有新配置项均为可选
3. **默认行为不变**：不配置新选项时，行为与现有版本一致

### 7.2 迁移示例

```typescript
// 现有配置（继续有效）
{
  "config": {
    "enableCheckpoints": true
  }
}

// 新配置（更灵活）
{
  "config": {
    "enableCheckpoints": true,
    "checkpointConfig": {
      "enabled": true
    }
  },
  "nodes": [
    {
      "id": "node1",
      "checkpointBeforeExecute": true
    }
  ]
}
```

## 8. 性能考虑

### 8.1 优化策略

1. **配置缓存**：节点和工具配置缓存，避免重复解析
2. **批量创建**：支持批量检查点创建，减少I/O
3. **异步执行**：检查点创建异步执行，不影响主流程
4. **条件评估优化**：Hook和Trigger条件评估结果缓存

### 8.2 监控指标

1. 检查点创建次数和耗时
2. Hook/Trigger触发频率
3. 工具调用检查点创建率
4. 检查点恢复成功率

## 9. 总结

本简化方案通过以下方式解决了用户需求：

1. **配置简化**：在现有Trigger和Hook机制中扩展检查点配置
2. **工具级支持**：在Tool定义中直接配置检查点行为
3. **函数式接口**：提供无状态的检查点创建函数
4. **无状态协调器**：CheckpointCoordinator提供无状态方法
5. **优先级清晰**：节点级 > Hook/Trigger级 > 全局级
6. **向后兼容**：保留现有配置，平滑升级

该方案更加简洁实用，易于理解和维护，同时提供了足够的灵活性满足各种检查点创建需求。