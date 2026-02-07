我有一个更好的想法：fork id原先是用于保证fork与join对应的，可以改造为fork path id数组，每条路径全局唯一，且与childNodeIds逐一对应，fork、join节点的fork path id数组必须完全一致(顺序也要求一致，以简化验证逻辑)。join节点新增可选的main path id字段，必须是join节点的fork path id数组已有的值。若main path id不存在则直接取fork path id的第0个值作为main path
这样可以避免需要使用metadata，并充分利用fork、join的一致性保障字段来指定

这是一个非常好的想法！让我重新设计方案。

### 新方案：使用Fork Path ID数组

**核心思想**：
1. 将原来的`forkId`（单个ID）改造为`forkPathIds`（ID数组）
2. `forkPathIds`与`childNodeIds`一一对应，每条路径有全局唯一的Path ID
3. FORK和JOIN节点的`forkPathIds`数组必须完全一致（包括顺序）
4. JOIN节点新增可选的`mainPathId`字段，指定主线程路径
5. 如果`mainPathId`不存在，则默认使用`forkPathIds[0]`作为主线程

**优势**：
- 避免了复杂的运行时路径追踪
- 充分利用现有的FORK/JOIN一致性保障机制
- 配置清晰明确，易于理解和验证
- 不需要额外的metadata存储

让我重新设计类型定义：

### 更新后的ForkNodeConfig
```typescript
/**
 * 分叉节点配置
 */
export interface ForkNodeConfig {
  /** 
   * 分叉路径ID数组，与childNodeIds一一对应
   * 每个路径ID全局唯一，用于标识不同的执行路径
   */
  forkPathIds: ID[];
  /** 分叉策略(串行、并行) */
  forkStrategy: 'serial' | 'parallel';
  /** 子节点ID列表，与forkPathIds一一对应 */
  childNodeIds: string[];
}
```

### 更新后的JoinNodeConfig
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

### 运行时实现

**FORK操作时**：
- 为每个子线程在metadata中存储对应的`forkPathId`
- 这样在JOIN操作时就能知道每个子线程对应的路径ID

**JOIN操作时**：
- 验证`forkPathIds`数组与FORK节点一致
- 验证`mainPathId`是否在`forkPathIds`中
- 找到对应`mainPathId`的子线程
- 将该子线程的对话历史合并到父线程

让我更新TODO列表：

---

此外，需要明确forkPathId的全局唯一的表述是我不严谨，应当是工作流定义的内部唯一，实际上图构建后会合并子工作流，这是fork path id就可能重复，需要重新赋予唯一id。
此外，不要在运行时往metadata存储内部数据，因为这是暴露给用户配置的，使用internal metadata

---

internalMetadata是graphData的概念
对于Thread运行时，Thread类型中有一个contextData字段，可以用来存储内部数据。