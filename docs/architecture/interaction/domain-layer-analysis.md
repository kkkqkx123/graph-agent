# Interaction 模块 Domain 层分析

## 一、当前设计问题

当前 `src/services/interaction` 目录的所有实现都在 Services 层，缺少 Domain 层的定义，违反了 DDD 分层架构原则。

## 二、应该在 Domain 层实现的部分

### 2.1 值对象 (Value Objects)

#### MessageRole (枚举)
**位置**: `src/domain/interaction/value-objects/message-role.ts`

```typescript
/**
 * 消息角色枚举
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}
```

**理由**: 消息角色是业务概念，属于领域层。

#### Message (值对象)
**位置**: `src/domain/interaction/value-objects/message.ts`

```typescript
/**
 * 消息值对象
 */
export class Message {
  private readonly _role: MessageRole;
  private readonly _content: string;
  private readonly _toolCallId?: string;
  private readonly _toolCalls?: ToolCall[];
  private readonly _timestamp?: string;

  constructor(props: {
    role: MessageRole;
    content: string;
    toolCallId?: string;
    toolCalls?: ToolCall[];
    timestamp?: string;
  }) {
    this._role = props.role;
    this._content = props.content;
    this._toolCallId = props.toolCallId;
    this._toolCalls = props.toolCalls;
    this._timestamp = props.timestamp || new Date().toISOString();
  }

  get role(): MessageRole { return this._role; }
  get content(): string { return this._content; }
  get toolCallId(): string | undefined { return this._toolCallId; }
  get toolCalls(): ToolCall[] | undefined { return this._toolCalls; }
  get timestamp(): string { return this._timestamp; }

  equals(other: Message): boolean {
    return (
      this._role === other._role &&
      this._content === other._content &&
      this._toolCallId === other._toolCallId
    );
  }
}
```

**理由**: 消息是领域概念，应该作为值对象在 Domain 层定义。

#### ToolCall (值对象)
**位置**: `src/domain/interaction/value-objects/tool-call.ts`

```typescript
/**
 * 工具调用值对象
 */
export class ToolCall {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _arguments: Record<string, any>;
  private readonly _result?: any;
  private readonly _executionTime?: number;
  private readonly _timestamp?: string;

  constructor(props: {
    id: string;
    name: string;
    arguments: Record<string, any>;
    result?: any;
    executionTime?: number;
    timestamp?: string;
  }) {
    this._id = props.id;
    this._name = props.name;
    this._arguments = { ...props.arguments };
    this._result = props.result;
    this._executionTime = props.executionTime;
    this._timestamp = props.timestamp || new Date().toISOString();
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get arguments(): Record<string, any> { return { ...this._arguments }; }
  get result(): any { return this._result; }
  get executionTime(): number | undefined { return this._executionTime; }
  get timestamp(): string { return this._timestamp; }
}
```

**理由**: 工具调用是领域概念，应该作为值对象在 Domain 层定义。

#### LLMCall (值对象)
**位置**: `src/domain/interaction/value-objects/llm-call.ts`

```typescript
/**
 * LLM 调用值对象
 */
export class LLMCall {
  private readonly _id: string;
  private readonly _provider: string;
  private readonly _model: string;
  private readonly _messages: Message[];
  private readonly _response: string;
  private readonly _toolCalls?: ToolCall[];
  private readonly _usage?: TokenUsage;
  private readonly _timestamp: string;
  private readonly _executionTime?: number;

  constructor(props: {
    id: string;
    provider: string;
    model: string;
    messages: Message[];
    response: string;
    toolCalls?: ToolCall[];
    usage?: TokenUsage;
    timestamp: string;
    executionTime?: number;
  }) {
    this._id = props.id;
    this._provider = props.provider;
    this._model = props.model;
    this._messages = [...props.messages];
    this._response = props.response;
    this._toolCalls = props.toolCalls;
    this._usage = props.usage;
    this._timestamp = props.timestamp;
    this._executionTime = props.executionTime;
  }

  get id(): string { return this._id; }
  get provider(): string { return this._provider; }
  get model(): string { return this._model; }
  get messages(): Message[] { return [...this._messages]; }
  get response(): string { return this._response; }
  get toolCalls(): ToolCall[] | undefined { return this._toolCalls; }
  get usage(): TokenUsage | undefined { return this._usage; }
  get timestamp(): string { return this._timestamp; }
  get executionTime(): number | undefined { return this._executionTime; }
}
```

**理由**: LLM 调用是领域概念，应该作为值对象在 Domain 层定义。

#### TokenUsage (值对象)
**位置**: `src/domain/interaction/value-objects/token-usage.ts`

```typescript
/**
 * Token 使用情况值对象
 */
export class TokenUsage {
  private readonly _promptTokens: number;
  private readonly _completionTokens: number;
  private readonly _totalTokens: number;

  constructor(props: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) {
    this._promptTokens = props.promptTokens;
    this._completionTokens = props.completionTokens;
    this._totalTokens = props.totalTokens;
  }

  get promptTokens(): number { return this._promptTokens; }
  get completionTokens(): number { return this._completionTokens; }
  get totalTokens(): number { return this._totalTokens; }

  add(other: TokenUsage): TokenUsage {
    return new TokenUsage({
      promptTokens: this._promptTokens + other._promptTokens,
      completionTokens: this._completionTokens + other._completionTokens,
      totalTokens: this._totalTokens + other._totalTokens,
    });
  }
}
```

**理由**: Token 使用情况是领域概念，应该作为值对象在 Domain 层定义。

#### LLMConfig (值对象)
**位置**: `src/domain/interaction/value-objects/llm-config.ts`

```typescript
/**
 * LLM 配置值对象
 */
export class LLMConfig {
  private readonly _provider: string;
  private readonly _model: string;
  private readonly _prompt: string;
  private readonly _systemPrompt?: string;
  private readonly _temperature?: number;
  private readonly _maxTokens?: number;
  private readonly _topP?: number;
  private readonly _frequencyPenalty?: number;
  private readonly _presencePenalty?: number;
  private readonly _stopSequences?: string[];
  private readonly _stream?: boolean;

  constructor(props: {
    provider: string;
    model: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    stream?: boolean;
  }) {
    this._provider = props.provider;
    this._model = props.model;
    this._prompt = props.prompt;
    this._systemPrompt = props.systemPrompt;
    this._temperature = props.temperature;
    this._maxTokens = props.maxTokens;
    this._topP = props.topP;
    this._frequencyPenalty = props.frequencyPenalty;
    this._presencePenalty = props.presencePenalty;
    this._stopSequences = props.stopSequences;
    this._stream = props.stream;
  }

  get provider(): string { return this._provider; }
  get model(): string { return this._model; }
  get prompt(): string { return this._prompt; }
  get systemPrompt(): string | undefined { return this._systemPrompt; }
  get temperature(): number | undefined { return this._temperature; }
  get maxTokens(): number | undefined { return this._maxTokens; }
  get topP(): number | undefined { return this._topP; }
  get frequencyPenalty(): number | undefined { return this._frequencyPenalty; }
  get presencePenalty(): number | undefined { return this._presencePenalty; }
  get stopSequences(): string[] | undefined { return this._stopSequences; }
  get stream(): boolean | undefined { return this._stream; }
}
```

**理由**: LLM 配置是领域概念，应该作为值对象在 Domain 层定义。

#### ToolConfig (值对象)
**位置**: `src/domain/interaction/value-objects/tool-config.ts`

```typescript
/**
 * 工具配置值对象
 */
export class ToolConfig {
  private readonly _toolId: string;
  private readonly _parameters: Record<string, any>;
  private readonly _timeout?: number;

  constructor(props: {
    toolId: string;
    parameters: Record<string, any>;
    timeout?: number;
  }) {
    this._toolId = props.toolId;
    this._parameters = { ...props.parameters };
    this._timeout = props.timeout;
  }

  get toolId(): string { return this._toolId; }
  get parameters(): Record<string, any> { return { ...this._parameters }; }
  get timeout(): number | undefined { return this._timeout; }
}
```

**理由**: 工具配置是领域概念，应该作为值对象在 Domain 层定义。

#### UserInteractionConfig (值对象)
**位置**: `src/domain/interaction/value-objects/user-interaction-config.ts`

```typescript
/**
 * 用户交互配置值对象
 */
export class UserInteractionConfig {
  private readonly _interactionType: 'input' | 'confirmation' | 'selection';
  private readonly _prompt: string;
  private readonly _options?: string[];
  private readonly _timeout?: number;

  constructor(props: {
    interactionType: 'input' | 'confirmation' | 'selection';
    prompt: string;
    options?: string[];
    timeout?: number;
  }) {
    this._interactionType = props.interactionType;
    this._prompt = props.prompt;
    this._options = props.options;
    this._timeout = props.timeout;
  }

  get interactionType(): 'input' | 'confirmation' | 'selection' { return this._interactionType; }
  get prompt(): string { return this._prompt; }
  get options(): string[] | undefined { return this._options; }
  get timeout(): number | undefined { return this._timeout; }
}
```

**理由**: 用户交互配置是领域概念，应该作为值对象在 Domain 层定义。

### 2.2 领域服务 (Domain Services)

#### InteractionContext (领域服务)
**位置**: `src/domain/interaction/services/interaction-context.ts`

```typescript
/**
 * Interaction 上下文领域服务接口
 */
export interface IInteractionContext {
  getMessages(): Message[];
  addMessage(message: Message): void;
  clearMessages(): void;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  getToolCalls(): ToolCall[];
  addToolCall(toolCall: ToolCall): void;
  getLLMCalls(): LLMCall[];
  addLLMCall(llmCall: LLMCall): void;
  getTokenUsage(): TokenUsage;
  updateTokenUsage(usage: TokenUsage): void;
  getMetadata(key: string): any;
  setMetadata(key: string, value: any): void;
  clone(): IInteractionContext;
}
```

**理由**: InteractionContext 是领域概念，管理交互状态，应该在 Domain 层定义接口。

### 2.3 领域事件 (Domain Events)

#### LLMExecutionCompleted (领域事件)
**位置**: `src/domain/interaction/events/llm-execution-completed.ts`

```typescript
/**
 * LLM 执行完成领域事件
 */
export class LLMExecutionCompleted {
  constructor(
    public readonly llmCallId: string,
    public readonly success: boolean,
    public readonly output?: string,
    public readonly error?: string,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

**理由**: LLM 执行完成是领域事件，应该在 Domain 层定义。

#### ToolExecutionCompleted (领域事件)
**位置**: `src/domain/interaction/events/tool-execution-completed.ts`

```typescript
/**
 * 工具执行完成领域事件
 */
export class ToolExecutionCompleted {
  constructor(
    public readonly toolCallId: string,
    public readonly success: boolean,
    public readonly output?: any,
    public readonly error?: string,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

**理由**: 工具执行完成是领域事件，应该在 Domain 层定义。

### 2.4 仓储接口 (Repository Interfaces)

#### InteractionContextRepository (仓储接口)
**位置**: `src/domain/interaction/repositories/interaction-context-repository.ts`

```typescript
/**
 * Interaction 上下文仓储接口
 */
export interface IInteractionContextRepository {
  save(contextId: string, context: IInteractionContext): Promise<void>;
  findById(contextId: string): Promise<IInteractionContext | null>;
  delete(contextId: string): Promise<void>;
}
```

**理由**: 如果需要持久化 InteractionContext，应该在 Domain 层定义仓储接口。

## 三、应该在 Services 层实现的部分

### 3.1 InteractionEngine 实现
**位置**: `src/services/interaction/interaction-engine-impl.ts`

**理由**: InteractionEngine 是协调器，属于 Services 层。

### 3.2 Executors 实现
**位置**: `src/services/interaction/executors/`

**理由**: Executors 是执行器，属于 Services 层。

### 3.3 InteractionContext 实现
**位置**: `src/services/interaction/interaction-context-impl.ts`

**理由**: InteractionContext 的具体实现属于 Services 层。

### 3.4 执行结果 DTO
**位置**: `src/services/interaction/dtos/`

**理由**: 执行结果是数据传输对象，属于 Services 层。

## 四、重构建议

### 4.1 创建 Domain 层结构

```
src/domain/interaction/
├── index.ts
├── value-objects/
│   ├── index.ts
│   ├── message-role.ts
│   ├── message.ts
│   ├── tool-call.ts
│   ├── llm-call.ts
│   ├── token-usage.ts
│   ├── llm-config.ts
│   ├── tool-config.ts
│   └── user-interaction-config.ts
├── services/
│   ├── index.ts
│   └── interaction-context.ts
├── events/
│   ├── index.ts
│   ├── llm-execution-completed.ts
│   └── tool-execution-completed.ts
└── repositories/
    ├── index.ts
    └── interaction-context-repository.ts
```

### 4.2 更新 Services 层

```
src/services/interaction/
├── index.ts
├── interaction-engine.ts (接口)
├── interaction-engine-impl.ts (实现)
├── interaction-context-impl.ts (实现)
├── executors/
│   ├── index.ts
│   ├── llm-executor.ts
│   ├── tool-executor.ts
│   └── user-interaction-handler.ts
└── dtos/
    ├── index.ts
    ├── llm-execution-result.ts
    ├── tool-execution-result.ts
    └── user-interaction-result.ts
```

### 4.3 依赖关系

```
Services Layer (Interaction)
    ↓ depends on
Domain Layer (Interaction)
    ↓ depends on
Domain Layer (Common)
```

## 五、重构步骤

1. 创建 `src/domain/interaction/` 目录结构
2. 将值对象从 Services 层移到 Domain 层
3. 将领域服务接口定义在 Domain 层
4. 将领域事件定义在 Domain 层
5. 更新 Services 层使用 Domain 层的类型
6. 更新依赖注入配置
7. 更新测试

## 六、总结

| 类型 | 当前位置 | 应该位置 | 理由 |
|------|---------|---------|------|
| MessageRole | Services | Domain | 领域概念 |
| Message | Services | Domain | 领域概念 |
| ToolCall | Services | Domain | 领域概念 |
| LLMCall | Services | Domain | 领域概念 |
| TokenUsage | Services | Domain | 领域概念 |
| LLMConfig | Services | Domain | 领域概念 |
| ToolConfig | Services | Domain | 领域概念 |
| UserInteractionConfig | Services | Domain | 领域概念 |
| IInteractionContext | Services | Domain | 领域服务接口 |
| InteractionContext (实现) | Services | Services | 具体实现 |
| IInteractionEngine | Services | Services | 服务接口 |
| InteractionEngine (实现) | Services | Services | 具体实现 |
| ILLMExecutor | Services | Services | 服务接口 |
| LLMExecutor (实现) | Services | Services | 具体实现 |
| ExecutionResult | Services | Services | DTO |