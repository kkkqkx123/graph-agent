# TokenUsageTracker 职责分析与重构建议

## 当前现状

### TokenUsageTracker 的职责分解

`TokenUsageTracker` 目前承担了以下职责：

1. **Token 使用统计累积** ✓ 核心职责
   - `updateApiUsage()`: 更新 API 返回的 usage
   - `accumulateStreamUsage()`: 累积流式 token
   - `finalizeCurrentRequest()`: 完成请求的 token 统计

2. **Token 使用估算** ⚠️ 可分离的职责
   - `estimateTokens(messages)`: 调用工具函数进行估算
   - `getTokenUsage(messages)`: 优先使用 API 统计，否则使用估算
   - `isTokenLimitExceeded(messages)`: 检查是否超限

3. **历史记录管理** ✓ 核心职责
   - `getUsageHistory()`: 获取历史记录
   - `getRecentHistory(n)`: 获取最近 N 条记录
   - `getStatistics()`: 统计信息
   - `rollbackToRequest()`: 回退机制

4. **状态管理与持久化** ✓ 核心职责
   - `setState()`: 从检查点恢复
   - `getState()`: 保存到检查点
   - `clone()`: 克隆实例
   - `reset()`/`fullReset()`: 重置状态

5. **Token 计算工具方法** ⚠️ 缺少类型支持
   - 实现的工具函数（`token-utils.ts` 中的函数）是低层的字符数估算
   - 不支持 tiktoken 的精确计算

---

## 问题分析

### 1. 职责划分不清晰

**问题**：`TokenUsageTracker` 混合了两层不同的关注点：
- **高层**：Token 累积、历史、回退（业务逻辑）
- **低层**：Token 估算算法（技术工具）

**表现**：
```typescript
// TokenUsageTracker 中的方法直接调用工具函数
estimateTokens(messages: LLMMessage[]): number {
  return estimateTokensUtil(messages);  // 工具方法暴露在 tracker 中
}
```

### 2. Token 计算能力差

**当前**：`token-utils.ts` 只提供简单的字符数估算（2.5 字符/token）
```typescript
// 粗略估算：平均每个 Token 约 2.5 个字符
return Math.ceil(totalChars / 2.5);
```

**需求**：应该使用 tiktoken 进行精确计算（如应用层的 `TokenCalculator`）

**差异**：
| 方式 | 准确度 | 特点 | 适用场景 |
|------|------|------|---------|
| 字符数估算 | 低（±30%） | 快速、无依赖 | 粗略预估 |
| tiktoken | 高（±5%） | 精确、需要初始化 | 严格控制 |

### 3. 工具层设计欠缺

**缺陷**：
- `token-utils.ts` 是纯函数，但完全依赖 `TokenUsageTracker` 来调用
- 没有独立的 Token 计算服务层
- 应用层有 `TokenCalculator`，SDK 层没有对应抽象

### 4. 与应用层的不对称

**应用层设计**：
```
ITokenCalculator (接口)
    ↓
BaseTokenCalculator (基类)
    ├→ LocalTokenCalculator (tiktoken 实现)
    ├→ ApiResponseTokenCalculator (API 响应解析)
    └→ TokenCalculator (统一聚合)
```

**SDK 层现状**：
```
TokenUsageTracker (直接实现 + 工具函数调用)
    └→ token-utils.ts (字符数估算)
```

**问题**：SDK 和应用层的 token 计算能力严重不对称。

---

## 重构建议

### 方案 1：分层 + 引入计算器抽象（推荐）

#### 目标
- TokenUsageTracker 只负责统计和历史管理
- 新建 TokenCalculator 层负责 token 计算
- 遵循单一职责原则

#### 实现步骤

**步骤 1**：在 `sdk/core/tools/` 下创建 Token 计算器
```
sdk/core/
├── tools/
│   └── token-calculators/
│       ├── token-calculator.ts      # 统一的 token 计算接口
│       ├── local-calculator.ts      # 基于 tiktoken 的计算器
│       └── fallback-calculator.ts   # 字符数估算作为 fallback
└── execution/
    └── token-usage-tracker.ts       # 仅负责统计和历史
```

**步骤 2**：定义计算器接口（或复用应用层的设计）
```typescript
// sdk/core/tools/token-calculators/token-calculator.ts
export interface TokenCalculator {
  /**
   * 估算消息的 token 数量
   */
  estimateTokens(messages: LLMMessage[]): Promise<number>;
  
  /**
   * 估算文本的 token 数量
   */
  estimateText(text: string): Promise<number>;
  
  /**
   * 检查是否超过限制
   */
  isTokenLimitExceeded(messages: LLMMessage[], limit: number): Promise<boolean>;
}
```

**步骤 3**：重构 TokenUsageTracker
```typescript
export class TokenUsageTracker {
  private calculator: TokenCalculator;
  
  constructor(calculator: TokenCalculator, options?: TokenUsageTrackerOptions) {
    this.calculator = calculator;  // 注入计算器
    // ... 其他初始化
  }
  
  // 只负责统计和历史，不再暴露 estimateTokens
  // 对外 API 改为内部使用
}
```

**步骤 4**：更新应用层的集成
- ConversationManager 使用新的 TokenCalculator
- 提高 SDK 的 token 计算精度

---

### 方案 2：轻量级封装（折中方案）

如果不想大幅重构，可以采用轻量级方案：

**目标**：逐步改进，减少破坏性变化

**实现**：
1. 将 `token-utils.ts` 的函数改为异步，支持 tiktoken fallback
2. 在 `TokenUsageTracker` 中注入一个 `TokenCalculator` 实例
3. 渐进式迁移现有代码

```typescript
// token-utils.ts
export async function estimateTokens(
  messages: LLMMessage[], 
  calculator?: TokenCalculator
): Promise<number> {
  if (calculator) {
    return calculator.estimateTokens(messages);  // 优先使用注入的计算器
  }
  // fallback 到字符数估算
  return estimateTokensByCharCount(messages);
}
```

---

### 方案 3：简化现有设计（最小改动）

**目标**：改进当前 token 计算，保持现有结构

**实现**：
1. 将 `token-utils.ts` 中的字符数估算改为 tiktoken（异步初始化 + 缓存）
2. 保持 `TokenUsageTracker` 的 API 不变
3. 改进精度，无需大幅重构

**优势**：改动最小，立竿见影
**劣势**：职责仍不清晰，后期难以维护

---

## 推荐方案：方案 1（分层 + 计算器抽象）

### 原因

1. **符合 AGENTS.md 的设计原则**
   - ✓ 分离关注点：统计 vs 计算
   - ✓ 避免循环依赖：通过注入计算器
   - ✓ 可配置性：支持多种计算实现

2. **与应用层保持一致**
   - SDK 和应用层使用同一抽象
   - 便于共享代码和工具

3. **长期可维护性**
   - 易于扩展（新增计算器不影响 tracker）
   - 易于测试（计算器可以 mock）
   - 清晰的职责边界

4. **遵循依赖规则**
   ```
   Types ← Utils ← Core ← API
   
   新增结构：
   Types ← Utils ← [Tools/TokenCalculators] ← Execution ← API
   ```

---

## 实施计划

### 第一阶段：定义接口（非破坏性）
- [ ] 在 `sdk/types/` 中定义 `TokenCalculator` 接口
- [ ] 在 `sdk/utils/` 中创建计算器工具函数

### 第二阶段：实现计算器（非破坏性）
- [ ] 创建 `sdk/core/tools/token-calculators/` 目录
- [ ] 实现 `LocalTokenCalculator`（基于 tiktoken）
- [ ] 实现 `FallbackCalculator`（字符数估算）

### 第三阶段：集成到 TokenUsageTracker（破坏性）
- [ ] 修改 `TokenUsageTracker` 接受计算器注入
- [ ] 保留 API 兼容性（可选的计算器注入）
- [ ] 更新测试

### 第四阶段：更新应用层（破坏性）
- [ ] 更新 `ConversationManager` 初始化
- [ ] 同步应用层的 `TokenCalculator`
- [ ] 集成测试

---

## 具体代码示例

### TokenCalculator 接口（sdk/types/token-calculator.ts）
```typescript
import type { LLMMessage } from './llm';

export interface ITokenCalculator {
  /**
   * 初始化计算器
   */
  initialize(): Promise<void>;
  
  /**
   * 估算消息的 token 数量
   */
  estimateTokens(messages: LLMMessage[]): Promise<number>;
  
  /**
   * 估算文本的 token 数量
   */
  estimateText(text: string): Promise<number>;
}
```

### LocalTokenCalculator（sdk/core/tools/token-calculators/local-calculator.ts）
```typescript
import type { LLMMessage } from '../../../types';
import type { ITokenCalculator } from '../../../types/token-calculator';

export class LocalTokenCalculator implements ITokenCalculator {
  private encoding: any = null;
  
  async initialize(): Promise<void> {
    try {
      const tiktoken = await import('tiktoken');
      this.encoding = tiktoken.get_encoding('cl100k_base');
    } catch (error) {
      console.warn('Tiktoken 初始化失败，将使用字符数估算');
    }
  }
  
  async estimateTokens(messages: LLMMessage[]): Promise<number> {
    if (this.encoding) {
      return this.countWithTiktoken(messages);
    }
    return this.countByCharacter(messages);
  }
  
  // ... 实现细节
}
```

### 更新 TokenUsageTracker
```typescript
export class TokenUsageTracker {
  private calculator: ITokenCalculator;
  
  constructor(
    calculator?: ITokenCalculator,
    options?: TokenUsageTrackerOptions
  ) {
    // 支持可选的计算器注入，默认使用简单估算
    this.calculator = calculator || new SimpleCalculator();
    // ... 初始化
  }
  
  // 内部使用，不再暴露
  private async estimateTokens(messages: LLMMessage[]): Promise<number> {
    return this.calculator.estimateTokens(messages);
  }
  
  // 对外 API 保持不变
  getTokenUsage(messages: LLMMessage[]): number {
    // ...
  }
}
```

---

## 总结

**当前状态**：TokenUsageTracker 混合了统计和计算两层职责，token 计算能力有限

**推荐改进**：
1. 分离统计和计算职责
2. 引入 TokenCalculator 抽象层
3. 支持 tiktoken 精确计算
4. 与应用层保持设计一致

**优先级**：Medium → High（取决于 token 计算精度的业务需求）
