# 上下文压缩类型定义

## 概述

本文档定义了上下文压缩和修改相关的类型，包括消息类型、标记类型、索引映射类型、压缩配置和策略接口。

## 一、LLM 消息类型

### LLMMessage

```typescript
/**
 * LLM消息类型
 * 保持简洁，不添加压缩标记
 */
export interface LLMMessage {
  /** 角色（system、user、assistant、tool） */
  role: LLMMessageRole;
  /** 消息内容（字符串或对象数组） */
  content: string | any[];
  /** 工具调用数组（assistant角色） */
  toolCalls?: LLMToolCall[];
  /** 工具调用ID（tool角色） */
  toolCallId?: string;
}
```

**设计说明**：
- 保持简洁，不添加任何压缩或修改相关的标记
- 压缩和修改信息通过独立的标记系统管理
- 支持多种消息角色和工具调用

## 二、消息标记类型

### MessageMarkMap

```typescript
/**
 * 消息标记映射
 * 维护消息索引的映射关系，支持多次压缩和回退
 */
export interface MessageMarkMap {
  /** 消息原始索引列表 */
  originalIndices: number[];
  /** 修改边界索引数组（记录被压缩/修改的消息的原始索引。第0个索引默认填上） */
  batchBoundaries: number[];
  /** 边界对应批次数组（记录每个边界是哪个batch的开始，允许重新使用旧的batch） */
  boundaryToBatch: number[];
  /** 当前批次 */
  currentBatch: number;
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `originalIndices` | `number[]` | 所有消息的原始索引列表 |
| `batchBoundaries` | `number[]` | 修改边界索引数组，记录每个批次的起始位置 |
| `boundaryToBatch` | `number[]` | 边界对应批次数组，与 `batchBoundaries` 一一对应 |
| `currentBatch` | `number` | 当前批次号 |

**设计要点**：

1. **简化设计**
   - 移除了 `MessageMark` 类型，简化了类型系统
   - 使用 `originalIndices` 替代 `marks`，只存储原始索引
   - 通过边界和批次信息计算其他状态

2. **batchBoundaries 数组**
   - 记录被压缩/修改的消息的原始索引
   - 第0个索引必须作为第0个batch的一个边界，保持逻辑一致性
   - 例如：`[0, 5, 10]` 表示批次从索引 0、5、10 开始

3. **boundaryToBatch 数组**
   - 与 `batchBoundaries` 一一对应
   - 记录每个边界对应的批次号
   - 允许重新使用旧的批次号，支持批次循环
   - 例如：`[0, 1, 0]` 表示边界 0 对应批次 0，边界 5 对应批次 1，边界 10 对应批次 0

4. **批次循环示例**
   ```
   原始状态：batchBoundaries = [0], boundaryToBatch = [0], currentBatch = 0
   添加临时消息：batchBoundaries = [0, 5], boundaryToBatch = [0, 1], currentBatch = 1
   删除临时消息：batchBoundaries = [0], boundaryToBatch = [0], currentBatch = 0
   ```

5. **回退机制**
   - 通过 `currentBatch` 确定当前批次
   - 通过 `boundaryToBatch` 找到对应批次的边界
   - 通过 `batchBoundaries` 确定消息范围

**计算方法**：

```typescript
// 获取当前批次的消息索引
function getCurrentBatchIndices(markMap: MessageMarkMap): number[] {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  
  return markMap.originalIndices.filter(index => index >= boundary);
}

// 判断消息是否被修改
function isModified(originalIndex: number, markMap: MessageMarkMap): boolean {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  return originalIndex < boundary;
}

// 获取消息在当前批次中的索引
function getBatchIndex(originalIndex: number, markMap: MessageMarkMap): number {
  const currentBoundaryIndex = markMap.boundaryToBatch.indexOf(markMap.currentBatch);
  const boundary = markMap.batchBoundaries[currentBoundaryIndex];
  return originalIndex - boundary;
}
```

## 三、压缩配置类型

### ContextCompressionConfig

```typescript
/**
 * 上下文压缩配置
 */
export interface ContextCompressionConfig {
  /** 是否启用压缩 */
  enabled: boolean;
  /** 压缩阈值（token 数量） */
  threshold: number;
  /** 压缩后的目标 token 数量 */
  targetTokens: number;
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | `boolean` | 是否启用压缩功能 |
| `threshold` | `number` | 触发压缩的 token 阈值 |
| `targetTokens` | `number` | 压缩后目标 token 数量 |

**使用示例**：

```typescript
const compressionConfig: ContextCompressionConfig = {
  enabled: true,
  threshold: 6000,
  targetTokens: 4000
};
```

## 四、压缩策略接口

### CompressionStrategy

```typescript
/**
 * 上下文压缩策略接口
 */
export interface CompressionStrategy {
  /**
   * 压缩消息
   * @param messages 消息数组
   * @param markMap 标记映射
   * @param config 压缩配置
   * @returns 压缩后的消息数组和新的标记映射
   */
  compress(
    messages: LLMMessage[],
    markMap: MessageMarkMap,
    config: ContextCompressionConfig
  ): Promise<{
    messages: LLMMessage[];
    markMap: MessageMarkMap;
  }>;
}
```

**方法说明**：

- `compress()` 方法接收消息数组、标记映射和压缩配置
- 返回压缩后的消息数组和新的标记映射
- 支持异步操作，可以调用 LLM 进行智能压缩

### NoOpCompressionStrategy

```typescript
/**
 * 空压缩策略实现
 */
export class NoOpCompressionStrategy implements CompressionStrategy {
  async compress(
    messages: LLMMessage[],
    markMap: MessageMarkMap,
    config: ContextCompressionConfig
  ): Promise<{
    messages: LLMMessage[];
    markMap: MessageMarkMap;
  }> {
    // 空实现，不进行任何压缩
    return { messages, markMap };
  }
}
```

**使用场景**：
- 作为默认策略，不进行任何压缩
- 用于测试和开发阶段
- 作为其他压缩策略的基类

## 五、上下文修改类型

### ContextModificationOperation

```typescript
/**
 * 上下文修改操作类型
 */
export type ContextModificationOperation = 
  | 'insert'      // 插入消息
  | 'delete'      // 删除消息
  | 'replace'     // 替换消息
  | 'compress'    // 压缩消息
  | 'batch_start' // 开始新批次
  | 'batch_end';  // 结束批次
```

### ContextModificationConfig

```typescript
/**
 * 上下文修改配置
 */
export interface ContextModificationConfig {
  /** 操作类型 */
  operation: ContextModificationOperation;
  /** 消息索引数组 */
  indices: number[];
  /** 操作数据（用于 insert 和 replace） */
  data?: LLMMessage | LLMMessage[];
  /** 批次号（用于 batch_start 和 batch_end） */
  batch?: number;
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `operation` | `ContextModificationOperation` | 操作类型 |
| `indices` | `number[]` | 消息索引数组 |
| `data` | `LLMMessage \| LLMMessage[]` | 操作数据 |
| `batch` | `number` | 批次号 |

## 六、事件类型

### TokenLimitExceededEvent

```typescript
/**
 * Token 超过限制事件类型
 */
export interface TokenLimitExceededEvent extends BaseEvent {
  type: EventType.TOKEN_LIMIT_EXCEEDED;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `EventType.TOKEN_LIMIT_EXCEEDED` | 事件类型 |
| `tokensUsed` | `number` | 当前使用的 token 数量 |
| `tokenLimit` | `number` | token 限制阈值 |

## 七、类型关系图

```
LLMMessage (消息)
    ↓
MessageMarkMap (标记映射)
    ↓
CompressionStrategy (压缩策略)
    ↓
ContextCompressionConfig (压缩配置)
```

## 八、使用示例

### 1. 创建标记映射

```typescript
const markMap: MessageMarkMap = {
  originalIndices: [],
  batchBoundaries: [0],  // 第0个索引作为第0个batch的边界
  boundaryToBatch: [0],
  currentBatch: 0
};
```

### 2. 添加消息索引

```typescript
// 添加消息索引
markMap.originalIndices.push(0);
```

### 3. 创建新批次

```typescript
// 开始新批次
markMap.batchBoundaries.push(5);  // 从索引5开始新批次
markMap.boundaryToBatch.push(1);  // 批次号为1
markMap.currentBatch = 1;
```

### 4. 回退到旧批次

```typescript
// 回退到批次0
markMap.currentBatch = 0;
// 移除批次1的边界
markMap.batchBoundaries = [0];
markMap.boundaryToBatch = [0];
```

### 5. 批次循环示例

```typescript
// 初始状态
markMap = {
  originalIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  batchBoundaries: [0],
  boundaryToBatch: [0],
  currentBatch: 0
};

// 添加临时消息（批次1）
markMap.batchBoundaries.push(5);
markMap.boundaryToBatch.push(1);
markMap.currentBatch = 1;

// 删除临时消息（回到批次0）
markMap.batchBoundaries = [0];
markMap.boundaryToBatch = [0];
markMap.currentBatch = 0;
```

## 九、设计原则

### 1. 简洁性
- `LLMMessage` 保持简洁，不添加压缩或修改标记
- 压缩和修改信息通过独立的标记系统管理

### 2. 灵活性
- 支持多次压缩和修改
- 支持批次循环（0-1-0）
- 支持回退到任意批次

### 3. 一致性
- 第0个索引必须作为第0个batch的边界
- `batchBoundaries` 和 `boundaryToBatch` 一一对应
- 标记和消息保持同步

### 4. 可扩展性
- 预留扩展点，支持后续功能增强
- 支持自定义压缩策略
- 支持自定义修改操作

## 十、注意事项

### 1. 边界管理
- 必须确保 `batchBoundaries` 和 `boundaryToBatch` 长度一致
- 第0个索引必须始终作为第0个batch的边界
- 边界索引必须按升序排列

### 2. 批次管理
- `currentBatch` 必须在 `boundaryToBatch` 中存在
- 批次号可以重复使用，支持批次循环
- 回退时需要同步更新边界数组

### 3. 标记同步
- 添加消息时必须同步添加标记
- 修改消息时必须更新标记
- 删除消息时必须标记为已修改

### 4. 性能考虑
- 标记数组可能很大，需要考虑性能优化
- 批次操作可能影响性能，建议批量处理
- 回退操作可能需要重建标记映射

## 十一、后续扩展

### 1. 压缩策略
- `KeepRecentStrategy`：保留最近 N 条消息
- `KeepSystemAndRecentStrategy`：保留系统消息 + 最近 N 条
- `SmartSummaryStrategy`：智能摘要
- `SlidingWindowStrategy`：滑动窗口

### 2. 修改操作
- `merge`：合并消息
- `split`：拆分消息
- `transform`：转换消息

### 3. 标记增强
- 添加消息重要性标记
- 添加消息时间戳
- 添加消息元数据

## 十二、总结

本类型定义提供了完整的上下文压缩和修改的类型系统，具有以下特点：

1. **简洁性**：消息类型保持简洁，标记信息独立管理
2. **灵活性**：支持多次压缩、修改和回退
3. **一致性**：边界和批次管理保持一致
4. **可扩展性**：预留扩展点，支持后续功能增强

通过这个类型系统，SDK 可以有效地管理对话上下文，支持复杂的压缩和修改操作。