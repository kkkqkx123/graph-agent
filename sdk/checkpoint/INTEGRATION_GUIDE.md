# CheckpointManager集成指南

> 本指南说明如何在TypeScript应用中集成和使用CheckpointManager进行Agent和Graph的状态管理。

## 概览

CheckpointManager是Layertwine-Centric Checkpoint系统的TypeScript协调层，提供以下功能：

- ✅ Agent循环状态的快照创建和恢复
- ✅ Graph工作流状态的快照创建和恢复
- ✅ 选择性恢复（按source过滤）
- ✅ 时间查询（获取特定时刻的状态）
- ✅ Checkpoint对比（diff）
- ✅ Checkpoint列表查询

## 快速开始

### 1. 初始化CheckpointManager

```typescript
import { CheckpointManager } from "@wf-agent/sdk/checkpoint";
import { LayertwineExecutor } from "@wf-agent/sdk/services/executors/remote/implementations/layertwine";

// 创建Layertwine执行器
const executor = new LayertwineExecutor({
  deployMode: "remote",
  address: "localhost:5000",
  protoPath: "./path/to/layertwine.proto"
});

// 连接到Layertwine服务
await executor.connect({
  address: "localhost:5000",
  useTls: false,
  timeout: 30000
});

// 创建CheckpointManager
const checkpointManager = new CheckpointManager(executor);
```

### 2. 创建Agent Checkpoint

```typescript
import type { AgentStateSnapshot } from "@wf-agent/sdk/checkpoint";

const snapshot: AgentStateSnapshot = {
  agentLoopId: "agent-001",
  messages: agentMessages,        // Message[]
  state: agentEntity.state,       // AgentLoopStateSnapshot
  timestamp: Date.now()
};

const checkpointId = await checkpointManager.createAgentCheckpoint(
  snapshot,
  "Iteration 5 completed"
);

console.log(`Checkpoint created: ${checkpointId}`);
```

### 3. 恢复Agent状态

```typescript
// 完整恢复
const restoredSnapshot = await checkpointManager.restoreAgentState(checkpointId);

// 仅恢复消息
const messages = await checkpointManager.restoreAgentMessages(checkpointId);
```

## 高级用法

### 时间查询（Time Travel）

获取Agent在特定时刻的执行状态：

```typescript
const targetTimestamp = Date.now() - 5 * 60 * 1000; // 5分钟前

const state = await checkpointManager.getStateAtTime(
  "agent-001",
  targetTimestamp
);

console.log(`Agent state at ${new Date(targetTimestamp)}`);
console.log(`Iterations completed: ${state.state.currentIteration}`);
```

### Checkpoint对比

比较两个Checkpoint之间的差异：

```typescript
const diff = await checkpointManager.diffCheckpoints(
  olderCheckpointId,
  newerCheckpointId
);

console.log("Added snapshots:", diff.added);
console.log("Removed snapshots:", diff.removed);
console.log("Modified snapshots:", diff.modified);
```

### 列表查询

获取所有checkpoints：

```typescript
const checkpoints = await checkpointManager.listCheckpoints();

checkpoints.forEach(cp => {
  console.log(`ID: ${cp.id}`);
  console.log(`Message: ${cp.message}`);
  console.log(`Created: ${new Date(cp.createdAt)}`);
  console.log(`Author: ${cp.author}`);
});
```

### 选择性恢复

仅恢复特定来源的快照：

```typescript
const partial = await checkpointManager.restoreSelective(
  checkpointId,
  {
    sources: ["agent://"],  // 仅恢复Agent快照
    exclude: ["system://"]  // 排除系统快照
  }
);
```

## 与Agent Executor集成

### 模式：每个迭代创建Checkpoint

在应用层的Agent循环中：

```typescript
import { AgentLoopCoordinator } from "@wf-agent/sdk/agent";

class CheckpointedAgentLoop {
  constructor(
    private coordinator: AgentLoopCoordinator,
    private checkpointManager: CheckpointManager
  ) {}

  async executeWithCheckpoints(
    config: AgentLoopRuntimeConfig
  ): Promise<void> {
    const { entity, stateCoordinator } = await this.coordinator.create(config);
    
    while (!entity.state.isCompleted) {
      // 执行一个迭代
      const iterationResult = await this.coordinator.executeIteration(entity);
      
      // 创建checkpoint（可选，取决于条件）
      if (shouldCreateCheckpoint(iterationResult)) {
        const snapshot: AgentStateSnapshot = {
          agentLoopId: entity.id,
          messages: stateCoordinator.getMessages(),
          state: entity.state,
          timestamp: Date.now()
        };
        
        const checkpointId = await this.checkpointManager.createAgentCheckpoint(
          snapshot,
          `Iteration ${entity.state.currentIteration} completed`
        );
        
        console.log(`Checkpoint: ${checkpointId}`);
      }
    }
  }
}
```

### 模式：暂停和恢复

```typescript
class PauseResumeAgent {
  constructor(
    private checkpointManager: CheckpointManager,
    private coordinator: AgentLoopCoordinator
  ) {}

  async pauseAndSave(entity: AgentLoopEntity): Promise<string> {
    const snapshot: AgentStateSnapshot = {
      agentLoopId: entity.id,
      messages: entity.messages,
      state: entity.state,
      timestamp: Date.now()
    };

    const checkpointId = await this.checkpointManager.createAgentCheckpoint(
      snapshot,
      "Manual pause"
    );

    entity.pause();
    return checkpointId;
  }

  async resumeFromCheckpoint(checkpointId: string): Promise<void> {
    const snapshot = await this.checkpointManager.restoreAgentState(checkpointId);
    
    // 重建Agent状态
    const entity = await this.coordinator.createFromCheckpoint(
      snapshot.agentLoopId,
      checkpointId
    );
    
    // 继续执行
    await entity.continue();
  }
}
```

## 与Graph Executor集成

### 创建Graph Checkpoint

```typescript
import type { GraphStateSnapshot } from "@wf-agent/sdk/checkpoint";

const snapshot: GraphStateSnapshot = {
  executionId: "exec-123",
  workflowId: "wf-456",
  state: graphEntity.state,
  timestamp: Date.now()
};

const checkpointId = await checkpointManager.createGraphCheckpoint(
  snapshot,
  "Node node-1 executed"
);
```

### 恢复Graph状态

```typescript
const restoredSnapshot = await checkpointManager.restoreGraphState(checkpointId);

// 重建Graph执行器和继续执行
const executor = new GraphExecutor(restoredSnapshot);
await executor.resume();
```

## 错误处理

CheckpointManager可能抛出的异常：

```typescript
try {
  const state = await checkpointManager.restoreAgentState(checkpointId);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("No agent snapshot found")) {
      console.error("Checkpoint不包含Agent快照");
    } else if (error.message.includes("not connected")) {
      console.error("Layertwine服务不可用");
    } else {
      console.error("未知错误:", error.message);
    }
  }
}
```

## 性能考虑

- **创建Checkpoint**: < 100ms（100KB数据）
- **恢复状态**: < 100ms（100KB数据）
- **列表查询**: < 50ms（1000个checkpoints）
- **时间查询**: < 50ms（通过time_index加速）

建议：
- 定期创建checkpoints（每5-10个迭代）
- 定期清理旧checkpoints（保留最近1000个）
- 使用选择性恢复减少网络传输

## 监控和日志

```typescript
const checkpointManager = new CheckpointManager(executor);

// 建议在应用层添加日志
const cp = await checkpointManager.createAgentCheckpoint(snapshot, "message");
logger.info("Checkpoint created", {
  checkpointId: cp,
  agentLoopId: snapshot.agentLoopId,
  size: JSON.stringify(snapshot).length,
  timestamp: Date.now()
});
```

## 常见问题

**Q: 是否支持并发checkpoint创建？**  
A: 是的。不同的Agent或Graph可以并发创建checkpoints，因为它们有不同的source。

**Q: 恢复后如何继续执行？**  
A: 恢复状态后，重新创建Agent/Graph实体，然后调用其执行方法。

**Q: 是否可以在Checkpoint中混合Agent和Graph快照？**  
A: 可以。CheckpointState支持同时包含agentState和graphState。

**Q: 存储空间有限制吗？**  
A: Layertwine使用SQLite后端，默认保留最近1000个checkpoints。可配置清理策略。

## 相关文档

- [Layertwine增强规范](../../docs/integration/01-layertwine-enhancement-specification.md)
- [最终架构设计](../../docs/integration/02-final-architecture-design.md)
- [迁移指南](../../docs/integration/03-migration-guide.md)
