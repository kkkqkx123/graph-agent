# Fork/Join 主线程上下文处理实施规范

## 1. 类型定义变更

### ForkNodeConfig
```typescript
/**
 * 分叉节点配置
 */
export interface ForkNodeConfig {
  /** 
   * 分叉路径ID数组，与childNodeIds一一对应
   * 每个路径ID在工作流定义内部唯一
   * 图构建阶段会转换为全局唯一ID
   */
  forkPathIds: ID[];
  /** 分叉策略(串行、并行) */
  forkStrategy: 'serial' | 'parallel';
  /** 子节点ID列表，与forkPathIds一一对应 */
  childNodeIds: string[];
}
```

### JoinNodeConfig
```typescript
/**
 * 连接节点配置
 * 
 * 说明：
 * - 子线程ID由运行时动态确定，在FORK节点执行时生成并存储在执行上下文中，
 *   JOIN节点执行时从执行上下文读取，不在节点配置中定义。
 * - timeout 表示等待子线程完成的最长时间（秒）。
 *   当 timeout = 0 时表示不设置超时，一直等待直到条件满足；
 *   当 timeout > 0 时表示最多等待该秒数，超时则抛出 TimeoutError。
 * - forkPathIds 必须与配对的FORK节点完全一致（包括顺序）
 * - mainPathId 指定主线程路径，必须是forkPathIds中的一个值
 */
export interface JoinNodeConfig {
  /** 
   * 分叉路径ID数组，必须与配对的FORK节点完全一致
   */
  forkPathIds: ID[];
  /** 连接策略(ALL_COMPLETED、ANY_COMPLETED、ALL_FAILED、ANY_FAILED、SUCCESS_COUNT_THRESHOLD) */
  joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';
  /** 成功数量阈值（当joinStrategy为SUCCESS_COUNT_THRESHOLD时使用） */
  threshold?: number;
  /** 等待超时时间（秒）。0表示不超时，始终等待；>0表示最多等待的秒数。默认0（无超时） */
  timeout?: number;
  /** 主线程路径ID，必须是forkPathIds中的一个值。如果未指定，默认使用forkPathIds[0] */
  mainPathId?: ID;
}
```

## 2. 验证规则

### Fork节点验证规则
- `forkPathIds` 必须是非空数组
- `childNodeIds` 必须是非空数组  
- `forkPathIds.length` 必须等于 `childNodeIds.length`
- `forkPathIds` 中的所有ID在工作流定义内部必须唯一

### Join节点验证规则
- `forkPathIds` 必须是非空数组
- 如果指定了 `mainPathId`，必须存在于 `forkPathIds` 数组中
- `forkPathIds` 必须与配对的FORK节点完全一致（在图构建阶段验证）

## 3. 运行时实现

### Fork操作 (`thread-builder.ts`)
```typescript
// 在createFork方法中
const forkThread: Partial<Thread> = {
  // ... 其他属性
  contextData: {
    forkPathId: forkPathId // 对应的路径ID
  }
};
```

### Join操作 (`thread-operations.ts`)
```typescript
// 在join函数中，合并结果后
const mainPathId = joinConfig.mainPathId || joinConfig.forkPathIds[0];
const mainThread = completedThreads.find(thread => 
  thread.contextData?.forkPathId === mainPathId
);

if (mainThread && parentThreadContext) {
  const mainConversationManager = getThreadConversationManager(mainThread);
  parentThreadContext.conversationManager.restoreFromSnapshot(
    mainConversationManager.createSnapshot()
  );
}
```

## 4. 图构建阶段处理

在工作流预处理阶段，需要：

1. 遍历所有Fork-Join对
2. 为每个`forkPathIds`中的ID生成全局唯一ID
3. 更新Fork和Join节点的配置，确保一致性

## 5. 向后兼容性

当前还处于开发阶段，不存在向后兼容需求，直接修改即可

## 6. 测试场景

### 基本功能测试
- 单路径Fork/Join（mainPathId未指定）
- 多路径Fork/Join（指定mainPathId）
- 对话历史正确合并到父线程

### 验证测试
- forkPathIds和childNodeIds长度不一致
- mainPathId不在forkPathIds中
- forkPathIds为空数组

### 向后兼容性测试
- 旧格式forkId配置正常工作
- 混合新旧格式配置

## 7. 错误处理

### 验证错误
- `INVALID_FORK_PATH_IDS`: forkPathIds配置无效
- `MAIN_PATH_ID_NOT_FOUND`: mainPathId不在forkPathIds中
- `FORK_JOIN_MISMATCH`: Fork和Join的forkPathIds不匹配

### 运行时错误
- `MAIN_THREAD_NOT_FOUND`: 未找到对应mainPathId的子线程
- `CONVERSATION_MANAGER_MERGE_FAILED`: 对话历史合并失败