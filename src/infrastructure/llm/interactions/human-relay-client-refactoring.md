# HumanRelayClient 重构文档

## 概述

本文档记录了HumanRelayClient的重构过程，主要目标是分离用户交互逻辑，采用策略模式实现更好的架构设计。

## 重构前的问题

### 1. 职责过重
- **LLM客户端逻辑**：继承BaseLLMClient，负责LLM请求处理
- **用户交互逻辑**：包含readline接口管理、提示渲染、用户输入等待等具体实现
- **历史记录管理**：维护对话历史、提示历史、响应历史

### 2. 违反单一职责原则
一个类承担了太多不同的职责，导致：
- 代码复杂度高
- 难以测试
- 难以复用

## 重构方案

### 采用策略模式

#### 1. UserInteractionStrategy 接口
```typescript
interface UserInteractionStrategy {
  promptUser(question: string, timeout: number): Promise<string>;
  close(): Promise<void>;
}
```

#### 2. 具体实现
- **TerminalInteraction**：使用Node.js readline模块实现终端用户交互
- **MockInteraction**：用于测试环境，模拟用户输入

#### 3. PromptRenderingService
负责将提示数据渲染为用户友好的格式，分离了提示构建和渲染逻辑。

## 重构后的架构优势

### 1. 职责清晰
- **HumanRelayClient**：专注于LLM客户端逻辑
- **UserInteractionStrategy**：负责用户交互
- **PromptRenderingService**：负责提示渲染

### 2. 易于扩展
- 支持多种交互方式（终端、Web界面等）
- 易于添加新的交互策略
- 便于测试和模拟

### 3. 符合依赖注入模式
与项目现有的依赖注入架构保持一致。

## 使用示例

### 创建HumanRelayClient
```typescript
const clientConfig = {
  mode: HumanRelayMode.SINGLE,
  maxHistoryLength: 10,
  defaultTimeout: 30000
};

const humanRelayClient = new HumanRelayClient(
  httpClient,
  rateLimiter,
  tokenCalculator,
  configLoadingModule,
  clientConfig
);
```

### 使用不同的交互策略
```typescript
// 使用终端交互
const terminalInteraction = new TerminalInteraction();

// 使用模拟交互（测试环境）
const mockInteraction = new MockInteraction();
mockInteraction.setMockResponse('greeting', 'Hello from mock!');
```

## 后续改进建议

### 1. 依赖注入配置
将交互策略通过依赖注入配置，支持运行时切换。

### 2. Web交互策略
实现基于Web界面的交互策略。

### 3. 配置化模板
支持通过配置文件自定义提示模板。

## 总结

通过本次重构，HumanRelayClient的架构变得更加清晰和可维护。策略模式的使用使得用户交互逻辑可以独立开发和测试，为后续的功能扩展奠定了良好的基础。