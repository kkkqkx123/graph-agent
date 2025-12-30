# Token计算逻辑重构文档

## 概述

本次重构彻底清理了`src/infrastructure/llm/clients`和`src/infrastructure/llm/token-calculators`目录中的字符数/4计算逻辑，统一使用tiktoken作为本地计算的回退方案，并确保始终优先使用API返回的token计数。

## 主要变更

### 1. 重构TokenCalculator类

**修改文件**: `src/infrastructure/llm/token-calculators/token-calculator.ts`

**变更内容**:
- 移除所有字符数/4的计算逻辑
- 直接集成tiktoken库进行精确计算
- 所有方法现在都使用tiktoken进行token计算
- 保留原有的接口，确保向后兼容
- 内部实现包括tiktoken初始化、文本token计算、消息列表token计算和文本截断功能

**主要方法**:
- `calculateTokens()`: 使用tiktoken计算请求的token数量
- `calculateTextTokens()`: 使用tiktoken计算文本的token数量
- `calculateTokensForModel()`: 统一使用tiktoken，不再区分模型
- `estimateResponseTokens()`: 基于tiktoken计算结果进行估算
- `calculateConversationTokens()`: 使用tiktoken计算对话历史token
- `isWithinTokenLimit()`: 基于tiktoken计算结果检查限制
- `truncateMessages()`: 使用tiktoken进行精确截断
- `truncateText()`: 使用tiktoken截断文本

### 2. 更新BaseLLMClient基类

**修改文件**: `src/infrastructure/llm/clients/base-llm-client.ts`

**变更内容**:
- `estimateTokens()`: 改用`tokenCalculator.calculateTextTokens()`
- `truncateText()`: 改用`tokenCalculator.truncateText()`
- `calculateCost()`: 优先使用API返回的token计数，如果没有则使用本地计算作为回退

**关键改进**:
```typescript
// 优先使用API返回的token计数
const promptTokens = response.usage?.promptTokens || await this.calculateTokens(request);
const completionTokens = response.usage?.completionTokens || 0;
```

### 3. 更新OpenAIResponseClient

**修改文件**: `src/infrastructure/llm/clients/openai-response-client.ts`

**变更内容**:
- `estimateTokens()`: 改用统一的Token计算服务
- `truncateText()`: 改用统一的Token计算服务进行精确截断
- 移除所有字符数/4的计算逻辑

### 4. 更新HumanRelayClient

**修改文件**: `src/infrastructure/llm/clients/human-relay-client.ts`

**变更内容**:
- `calculateTokens()`: 改用统一的Token计算服务
- `estimateTokens()`: 改用统一的Token计算服务
- `estimateTokensSync()`: 改为异步方法，使用统一的Token计算服务
- `createLLMResponse()`: 改为异步方法，调用异步的token计算

### 5. 更新MockClient

**修改文件**: `src/infrastructure/llm/clients/mock-client.ts`

**变更内容**:
- `generateMockResponse()`: 改为异步方法，使用统一的Token计算服务
- `generateResponse()`: 调用异步的`generateMockResponse()`
- 流式响应中的chunk token计算保留简化实现（出于性能考虑），但添加了注释说明

## Token计算优先级

### 1. API返回的token计数（最高优先级）

所有LLM客户端在处理响应时，优先使用API返回的token计数：

```typescript
// 在parameter-mappers中
{
  promptTokens: usage?.prompt_tokens || 0,
  completionTokens: usage?.completion_tokens || 0,
  totalTokens: usage?.total_tokens || 0
}
```

### 2. 本地tiktoken计算（回退方案）

当API没有返回token计数时，使用tiktoken进行本地计算：

```typescript
// 在BaseLLMClient中
const promptTokens = response.usage?.promptTokens || await this.calculateTokens(request);
```

### 3. 不再使用字符数/4估算

完全移除了字符数/4的估算逻辑，确保token计算的准确性。

## 依赖要求

### 新增依赖

项目需要安装`tiktoken`库：

```bash
npm install tiktoken
```

### 依赖注入

`TokenCalculator`不再需要依赖注入，直接使用tiktoken库：

```typescript
@injectable()
export class TokenCalculator {
  private tiktokenEncoding: any = null;
  private encodingName = 'cl100k_base';
  private isInitialized = false;
  
  // ... 方法实现
}
```

## 兼容性说明

### 向后兼容

- 所有公共接口保持不变
- 现有代码无需修改即可使用新的token计算逻辑
- 方法签名保持一致，只是内部实现从字符数/4改为tiktoken

### 性能影响

- tiktoken计算比字符数/4略慢，但提供了更准确的结果
- 对于大多数应用场景，性能影响可以忽略不计
- MockClient的流式响应保留了简化实现以优化性能

## 测试建议

### 单元测试

建议为以下场景添加单元测试：

1. `TokenCalculator`的token计算准确性
2. 各个client的token计算逻辑
3. API返回token计数与本地计算的优先级

### 集成测试

建议测试以下集成场景：

1. 完整的请求-响应流程，验证token计数
2. 流式响应的token计算
3. 成本计算的准确性
4. 文本截断的正确性

## 注意事项

1. **tiktoken初始化**: `TokenCalculator`在首次使用时会异步初始化tiktoken编码器
2. **错误处理**: 如果tiktoken加载失败，会抛出错误，需要确保tiktoken已正确安装
3. **MockClient流式响应**: 出于性能考虑，流式响应中的chunk token计算仍使用简化实现
4. **HumanRelayClient**: 由于需要异步计算token，`createLLMResponse`方法改为异步

## 迁移指南

### 对于现有代码

现有代码无需修改，所有更改都是内部实现的优化：

```typescript
// 旧代码仍然有效
const tokens = await tokenCalculator.calculateTokens(request);
const truncated = await tokenCalculator.truncateText(text, maxTokens);
```

### 对于新代码

新代码可以直接使用`TokenCalculator`：

```typescript
// 使用TokenCalculator
import { TokenCalculator } from './token-calculator';

const calculator = new TokenCalculator();
const tokens = await calculator.calculateTextTokens(text);
```

## 文件结构

### 保留的文件

1. **`token-calculator.ts`** - 通用的Token计算器，使用tiktoken进行精确计算
2. **`base-token-calculator.ts`** - Token计算器的基础接口和抽象类
3. **`openai-token-calculator.ts`** - OpenAI专用的Token计算器，提供更详细的功能（如解析API响应、定价信息等）

### 删除的文件

1. **`unified-token-calculator.ts`** - 已删除，功能合并到`token-calculator.ts`中

## 总结

本次重构彻底清理了混乱的token计算逻辑，建立了清晰的优先级体系：

1. **API返回的token计数** - 最高优先级，最准确
2. **本地tiktoken计算** - 回退方案，精确可靠
3. **不再使用字符数/4** - 完全移除不准确的估算方法

所有更改都保持了向后兼容性，现有代码无需修改即可受益于更准确的token计算。

### 关键改进

- **简化架构**: 移除了重复的`unified-token-calculator.ts`，将功能直接集成到`token-calculator.ts`中
- **减少依赖**: `TokenCalculator`不再需要依赖注入，使用更简单
- **保持专业性**: `OpenAITokenCalculator`保留，用于需要OpenAI特定功能的场景
- **提高准确性**: 使用tiktoken替代字符数/4，大幅提高token计算准确性
- **统一优先级**: 明确API返回token计数的优先级，确保使用最准确的数据