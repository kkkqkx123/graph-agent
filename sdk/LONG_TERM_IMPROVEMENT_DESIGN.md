# 长期改进方案详细设计文档

## 1. 概述

本文档详细说明了SDK模块错误处理的长期改进方案，包括统一错误处理中间件和错误类型转换器的实现细节。

## 2. 当前问题分析

### 2.1 错误来源多样化

SDK需要处理来自多个源的错误：

1. **LLM API错误**
   - HTTP错误（4xx, 5xx）
   - 网络超时
   - JSON解析错误
   - AbortError（用户取消）

2. **工具调用错误**
   - 工具执行失败
   - 参数验证失败
   - 工具未找到
   - 超时错误

3. **脚本执行错误**
   - 语法错误
   - 运行时错误
   - 超时错误
   - 权限错误

4. **用户代码错误**
   - 任意类型的异常
   - 字符串错误消息
   - 非Error对象

### 2.2 当前处理方式的不足

```typescript
// 当前代码示例（sdk/core/execution/executors/llm-executor.ts:171-177）
throw new ExecutionError(
  `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
  undefined,
  undefined,
  { originalError: error, profileId: requestData.profileId },
  error instanceof Error ? error : undefined  // 重复的类型检查
);
```

**问题**：
1. 重复的类型检查代码
2. 错误信息提取逻辑分散
3. 缺乏统一的错误转换策略
4. 难以维护和扩展

## 3. 长期改进方案

### 3.1 方案一：统一错误处理中间件

#### 3.1.1 设计目标

1. **自动标准化**：所有错误自动转换为SDKError
2. **统一入口**：所有错误处理通过中间件
3. **可配置性**：支持自定义错误转换策略
4. **可观测性**：完整的错误链追踪

#### 3.1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Handling Middleware                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Error Source │  │ Error Source │  │ Error Source │      │
│  │   Detector   │  │   Detector   │  │   Detector   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │ Error Normalizer│                        │
│                  │  (统一标准化)    │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │ Error Enricher  │                        │
│                  │  (上下文增强)    │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│                           ▼                                 │
│                  ┌─────────────────┐                        │
│                  │ Error Router    │                        │
│                  │  (错误路由)     │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │  Logger  │      │  Emitter │      │  Handler │         │
│  └──────────┘      └──────────┘      └──────────┘         │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.3 核心组件实现

**文件**: `packages/common-utils/src/error/error-middleware.ts`

```typescript
/**
 * 错误处理中间件
 * 提供统一的错误处理能力
 */

import { SDKError, ErrorSeverity, ErrorContext } from '@modular-agent/types';
import { normalizeError, getErrorMessage } from './error-utils';

/**
 * 错误源类型
 */
export enum ErrorSource {
  LLM = 'llm',
  TOOL = 'tool',
  SCRIPT = 'script',
  USER_CODE = 'user_code',
  SYSTEM = 'system',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

/**
 * 错误检测器接口
 */
export interface ErrorDetector {
  /**
   * 检测错误是否匹配此检测器
   */
  canDetect(error: unknown): boolean;
  
  /**
   * 获取错误源类型
   */
  getSource(): ErrorSource;
  
  /**
   * 转换错误为SDKError
   */
  convert(error: unknown, context: ErrorContext): SDKError;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  /**
   * 是否启用错误链追踪
   */
  enableErrorChain?: boolean;
  
  /**
   * 是否保留原始错误
   */
  preserveOriginalError?: boolean;
  
  /**
   * 默认错误严重程度
   */
  defaultSeverity?: ErrorSeverity;
  
  /**
   * 自定义错误检测器
   */
  customDetectors?: ErrorDetector[];
}

/**
 * 错误处理中间件
 */
export class ErrorHandlingMiddleware {
  private detectors: ErrorDetector[] = [];
  private config: Required<ErrorHandlingConfig>;
  
  constructor(config: ErrorHandlingConfig = {}) {
    this.config = {
      enableErrorChain: config.enableErrorChain ?? true,
      preserveOriginalError: config.preserveOriginalError ?? true,
      defaultSeverity: config.defaultSeverity ?? ErrorSeverity.ERROR,
      customDetectors: config.customDetectors ?? []
    };
    
    // 初始化默认检测器
    this.initializeDefaultDetectors();
  }
  
  /**
   * 初始化默认错误检测器
   */
  private initializeDefaultDetectors(): void {
    // LLM错误检测器
    this.detectors.push(new LLMErrorDetector());
    // 工具错误检测器
    this.detectors.push(new ToolErrorDetector());
    // 脚本错误检测器
    this.detectors.push(new ScriptErrorDetector());
    // 网络错误检测器
    this.detectors.push(new NetworkErrorDetector());
    // AbortError检测器
    this.detectors.push(new AbortErrorDetector());
    
    // 添加自定义检测器
    this.detectors.push(...this.config.customDetectors);
  }
  
  /**
   * 处理错误
   * @param error 原始错误
   * @param context 错误上下文
   * @returns 标准化的SDKError
   */
  handleError(error: unknown, context: ErrorContext): SDKError {
    // 步骤1：检测错误源
    const detector = this.detectErrorSource(error);
    
    // 步骤2：转换错误
    let sdkError: SDKError;
    if (detector) {
      sdkError = detector.convert(error, context);
    } else {
      // 使用默认转换
      sdkError = this.convertDefault(error, context);
    }
    
    // 步骤3：增强错误上下文
    sdkError = this.enrichError(sdkError, context);
    
    return sdkError;
  }
  
  /**
   * 检测错误源
   */
  private detectErrorSource(error: unknown): ErrorDetector | null {
    for (const detector of this.detectors) {
      if (detector.canDetect(error)) {
        return detector;
      }
    }
    return null;
  }
  
  /**
   * 默认错误转换
   */
  private convertDefault(error: unknown, context: ErrorContext): SDKError {
    const normalizedError = normalizeError(error);
    return new SDKError(
      normalizedError.message,
      this.config.defaultSeverity,
      context,
      this.config.preserveOriginalError ? normalizedError : undefined
    );
  }
  
  /**
   * 增强错误上下文
   */
  private enrichError(error: SDKError, context: ErrorContext): SDKError {
    // 添加时间戳
    const enrichedContext = {
      ...context,
      timestamp: Date.now(),
      errorSource: this.detectErrorSource(error)?.getSource() || ErrorSource.UNKNOWN
    };
    
    // 如果需要保留原始错误，确保cause属性正确设置
    if (this.config.enableErrorChain && !error.cause) {
      // 这里可以添加额外的错误链处理逻辑
    }
    
    return error;
  }
  
  /**
   * 添加自定义检测器
   */
  addDetector(detector: ErrorDetector): void {
    this.detectors.push(detector);
  }
}

/**
 * LLM错误检测器
 */
class LLMErrorDetector implements ErrorDetector {
  canDetect(error: unknown): boolean {
    if (error instanceof Error) {
      // 检查是否是HTTP错误
      if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
        return true;
      }
      // 检查错误消息中是否包含LLM相关关键词
      const message = error.message.toLowerCase();
      return message.includes('llm') || 
             message.includes('openai') || 
             message.includes('anthropic') ||
             message.includes('gemini');
    }
    return false;
  }
  
  getSource(): ErrorSource {
    return ErrorSource.LLM;
  }
  
  convert(error: unknown, context: ErrorContext): SDKError {
    const err = error as Error;
    const statusCode = (err as any).statusCode;
    
    // 根据状态码确定严重程度
    let severity = ErrorSeverity.ERROR;
    if (statusCode === 429) {
      severity = ErrorSeverity.WARNING; // 速率限制，可以重试
    } else if (statusCode >= 500) {
      severity = ErrorSeverity.WARNING; // 服务器错误，可以重试
    }
    
    return new SDKError(
      `LLM error: ${err.message}`,
      severity,
      { ...context, statusCode, provider: 'unknown' },
      err
    );
  }
}

/**
 * 工具错误检测器
 */
class ToolErrorDetector implements ErrorDetector {
  canDetect(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('tool') || 
             message.includes('execution failed');
    }
    return false;
  }
  
  getSource(): ErrorSource {
    return ErrorSource.TOOL;
  }
  
  convert(error: unknown, context: ErrorContext): SDKError {
    const err = error as Error;
    return new SDKError(
      `Tool error: ${err.message}`,
      ErrorSeverity.WARNING,
      { ...context, toolName: context.toolName || 'unknown' },
      err
    );
  }
}

/**
 * 脚本错误检测器
 */
class ScriptErrorDetector implements ErrorDetector {
  canDetect(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('script') || 
             message.includes('syntax') ||
             message.includes('reference');
    }
    return false;
  }
  
  getSource(): ErrorSource {
    return ErrorSource.SCRIPT;
  }
  
  convert(error: unknown, context: ErrorContext): SDKError {
    const err = error as Error;
    return new SDKError(
      `Script error: ${err.message}`,
      ErrorSeverity.ERROR,
      { ...context, scriptName: context.scriptName || 'unknown' },
      err
    );
  }
}

/**
 * 网络错误检测器
 */
class NetworkErrorDetector implements ErrorDetector {
  canDetect(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') ||
             message.includes('econnrefused') ||
             message.includes('enotfound');
    }
    return false;
  }
  
  getSource(): ErrorSource {
    return ErrorSource.NETWORK;
  }
  
  convert(error: unknown, context: ErrorContext): SDKError {
    const err = error as Error;
    return new SDKError(
      `Network error: ${err.message}`,
      ErrorSeverity.WARNING,
      context,
      err
    );
  }
}

/**
 * AbortError检测器
 */
class AbortErrorDetector implements ErrorDetector {
  canDetect(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }
  
  getSource(): ErrorSource {
    return ErrorSource.SYSTEM;
  }
  
  convert(error: unknown, context: ErrorContext): SDKError {
    const err = error as Error;
    return new SDKError(
      `Operation aborted: ${err.message}`,
      ErrorSeverity.INFO,
      { ...context, abortReason: (err as any).reason },
      err
    );
  }
}
```

#### 3.1.4 使用示例

```typescript
// 在LLMExecutor中使用
import { ErrorHandlingMiddleware, ErrorSource } from '@modular-agent/common-utils';

class LLMExecutor {
  private errorMiddleware: ErrorHandlingMiddleware;
  
  constructor() {
    this.errorMiddleware = new ErrorHandlingMiddleware({
      enableErrorChain: true,
      defaultSeverity: ErrorSeverity.WARNING
    });
  }
  
  async execute(request: LLMRequest): Promise<LLMResult> {
    try {
      // 执行LLM调用
      return await this.client.generate(request);
    } catch (error) {
      // 使用中间件处理错误
      const context: ErrorContext = {
        threadId: request.threadId,
        nodeId: request.nodeId,
        operation: 'llm_call',
        profileId: request.profileId
      };
      
      const sdkError = this.errorMiddleware.handleError(error, context);
      
      // 根据错误严重程度决定是否抛出
      if (sdkError.severity === ErrorSeverity.ERROR) {
        throw sdkError;
      }
      
      // WARNING级别返回错误结果
      return {
        success: false,
        error: sdkError
      };
    }
  }
}
```

### 3.2 方案二：错误类型转换器

#### 3.2.1 设计目标

1. **类型安全**：提供类型安全的错误转换
2. **可扩展性**：支持自定义转换逻辑
3. **可测试性**：每个转换器独立可测试
4. **性能优化**：避免不必要的转换

#### 3.2.2 转换器架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Type Converter                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Converter Registry                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ LLM      │  │ Tool     │  │ Script   │  ...     │    │
│  │  │ Converter│  │ Converter│  │ Converter│          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Conversion Pipeline                     │    │
│  │  1. Detect → 2. Validate → 3. Transform → 4. Enrich │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Result: SDKError                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 核心实现

**文件**: `packages/common-utils/src/error/error-converter.ts`

```typescript
/**
 * 错误类型转换器
 * 提供类型安全的错误转换能力
 */

import { SDKError, ErrorSeverity, ErrorContext } from '@modular-agent/types';
import { normalizeError } from './error-utils';

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 转换后的错误 */
  error: SDKError;
  /** 是否成功转换 */
  success: boolean;
  /** 转换器名称 */
  converterName: string;
}

/**
 * 错误转换器接口
 */
export interface ErrorConverter<T = unknown> {
  /**
   * 转换器名称
   */
  readonly name: string;
  
  /**
   * 优先级（数字越小优先级越高）
   */
  readonly priority: number;
  
  /**
   * 检测是否可以转换此错误
   */
  canConvert(error: unknown): error is T;
  
  /**
   * 转换错误
   */
  convert(error: T, context: ErrorContext): SDKError;
}

/**
 * 转换器注册表
 */
export class ErrorConverterRegistry {
  private converters: Map<string, ErrorConverter> = new Map();
  private sortedConverters: ErrorConverter[] = [];
  
  /**
   * 注册转换器
   */
  register(converter: ErrorConverter): void {
    this.converters.set(converter.name, converter);
    this.sortConverters();
  }
  
  /**
   * 注销转换器
   */
  unregister(name: string): void {
    this.converters.delete(name);
    this.sortConverters();
  }
  
  /**
   * 获取转换器
   */
  get(name: string): ErrorConverter | undefined {
    return this.converters.get(name);
  }
  
  /**
   * 转换错误
   */
  convert(error: unknown, context: ErrorContext): ConversionResult {
    // 按优先级尝试转换
    for (const converter of this.sortedConverters) {
      if (converter.canConvert(error)) {
        const sdkError = converter.convert(error, context);
        return {
          error: sdkError,
          success: true,
          converterName: converter.name
        };
      }
    }
    
    // 没有匹配的转换器，使用默认转换
    const defaultError = normalizeError(error);
    const sdkError = new SDKError(
      defaultError.message,
      ErrorSeverity.ERROR,
      context,
      defaultError
    );
    
    return {
      error: sdkError,
      success: false,
      converterName: 'default'
    };
  }
  
  /**
   * 按优先级排序转换器
   */
  private sortConverters(): void {
    this.sortedConverters = Array.from(this.converters.values())
      .sort((a, b) => a.priority - b.priority);
  }
}

/**
 * 全局转换器注册表实例
 */
export const globalConverterRegistry = new ErrorConverterRegistry();

// ============================================================================
// 内置转换器
// ============================================================================

/**
 * LLM错误转换器
 */
export class LLMErrorConverter implements ErrorConverter {
  readonly name = 'LLMErrorConverter';
  readonly priority = 10;
  
  canConvert(error: unknown): error is Error & { statusCode?: number } {
    return error instanceof Error && 
           typeof (error as any).statusCode === 'number';
  }
  
  convert(error: Error & { statusCode?: number }, context: ErrorContext): SDKError {
    const statusCode = error.statusCode || 0;
    
    // 根据状态码确定错误类型和严重程度
    let severity = ErrorSeverity.ERROR;
    let message = `LLM error (${statusCode}): ${error.message}`;
    
    if (statusCode === 401) {
      message = `LLM authentication failed: ${error.message}`;
      severity = ErrorSeverity.ERROR;
    } else if (statusCode === 429) {
      message = `LLM rate limit exceeded: ${error.message}`;
      severity = ErrorSeverity.WARNING;
    } else if (statusCode >= 500) {
      message = `LLM server error (${statusCode}): ${error.message}`;
      severity = ErrorSeverity.WARNING;
    }
    
    return new SDKError(
      message,
      severity,
      { ...context, statusCode, errorType: 'http' },
      error
    );
  }
}

/**
 * AbortError转换器
 */
export class AbortErrorConverter implements ErrorConverter {
  readonly name = 'AbortErrorConverter';
  readonly priority = 5; // 高优先级
  
  canConvert(error: unknown): error is Error & { name: 'AbortError' } {
    return error instanceof Error && error.name === 'AbortError';
  }
  
  convert(error: Error & { name: 'AbortError' }, context: ErrorContext): SDKError {
    return new SDKError(
      `Operation aborted: ${error.message}`,
      ErrorSeverity.INFO,
      { ...context, abortReason: (error as any).reason },
      error
    );
  }
}

/**
 * 工具错误转换器
 */
export class ToolErrorConverter implements ErrorConverter {
  readonly name = 'ToolErrorConverter';
  readonly priority = 20;
  
  canConvert(error: unknown): error is Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('tool') || 
             message.includes('execution failed');
    }
    return false;
  }
  
  convert(error: Error, context: ErrorContext): SDKError {
    return new SDKError(
      `Tool execution failed: ${error.message}`,
      ErrorSeverity.WARNING,
      { ...context, toolName: context.toolName || 'unknown' },
      error
    );
  }
}

/**
 * 脚本错误转换器
 */
export class ScriptErrorConverter implements ErrorConverter {
  readonly name = 'ScriptErrorConverter';
  readonly priority = 20;
  
  canConvert(error: unknown): error is Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('script') || 
             message.includes('syntax') ||
             message.includes('reference');
    }
    return false;
  }
  
  convert(error: Error, context: ErrorContext): SDKError {
    return new SDKError(
      `Script execution failed: ${error.message}`,
      ErrorSeverity.ERROR,
      { ...context, scriptName: context.scriptName || 'unknown' },
      error
    );
  }
}

/**
 * 网络错误转换器
 */
export class NetworkErrorConverter implements ErrorConverter {
  readonly name = 'NetworkErrorConverter';
  readonly priority = 15;
  
  canConvert(error: unknown): error is Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') ||
             message.includes('econnrefused') ||
             message.includes('enotfound');
    }
    return false;
  }
  
  convert(error: Error, context: ErrorContext): SDKError {
    return new SDKError(
      `Network error: ${error.message}`,
      ErrorSeverity.WARNING,
      context,
      error
    );
  }
}

// 注册内置转换器
globalConverterRegistry.register(new AbortErrorConverter());
globalConverterRegistry.register(new LLMErrorConverter());
globalConverterRegistry.register(new NetworkErrorConverter());
globalConverterRegistry.register(new ToolErrorConverter());
globalConverterRegistry.register(new ScriptErrorConverter());
```

#### 3.2.4 使用示例

```typescript
// 在各个Executor中使用
import { globalConverterRegistry } from '@modular-agent/common-utils';

class ToolCallExecutor {
  async execute(toolCall: ToolCall, context: ErrorContext): Promise<ToolResult> {
    try {
      return await this.tool.execute(toolCall);
    } catch (error) {
      // 使用转换器转换错误
      const result = globalConverterRegistry.convert(error, context);
      
      // 记录转换信息
      if (!result.success) {
        console.warn(`No specific converter found for error, using default`);
      }
      
      // 根据严重程度处理
      if (result.error.severity === ErrorSeverity.ERROR) {
        throw result.error;
      }
      
      // 返回错误结果
      return {
        success: false,
        error: result.error
      };
    }
  }
}
```

### 3.3 方案对比

| 特性 | 方案一：中间件 | 方案二：转换器 |
|------|--------------|--------------|
| 复杂度 | 中等 | 较低 |
| 灵活性 | 高 | 中等 |
| 性能 | 中等 | 高 |
| 可测试性 | 中等 | 高 |
| 扩展性 | 高 | 高 |
| 学习曲线 | 较陡 | 较平 |

### 3.4 推荐方案

**推荐使用方案二（错误类型转换器）**，原因：

1. **更简单**：架构更清晰，易于理解和维护
2. **更高效**：直接转换，无需中间层
3. **更灵活**：每个转换器独立，易于测试和扩展
4. **类型安全**：提供完整的类型检查

## 4. 实施计划

### 4.1 阶段一：基础工具函数（已完成）
- [x] 创建 `error-utils.ts`
- [x] 实现 `normalizeError`、`getErrorMessage`、`isError`

### 4.2 阶段二：转换器实现（5-7天）
- [ ] 创建 `error-converter.ts`
- [ ] 实现基础转换器接口
- [ ] 实现内置转换器
- [ ] 创建转换器注册表
- [ ] 编写单元测试

### 4.3 阶段三：集成到SDK（7-10天）
- [ ] 更新 LLMExecutor
- [ ] 更新 ToolCallExecutor
- [ ] 更新 CodeService
- [ ] 更新其他相关组件
- [ ] 编写集成测试

### 4.4 阶段四：文档和示例（2-3天）
- [ ] 编写使用文档
- [ ] 创建示例代码
- [ ] 更新API文档

### 4.5 阶段五：优化和监控（持续）
- [ ] 性能监控
- [ ] 错误统计
- [ ] 持续优化

## 5. 风险和缓解措施

### 5.1 风险

1. **性能影响**：错误转换可能增加开销
2. **兼容性**：现有代码可能需要调整
3. **测试覆盖**：需要充分的测试覆盖

### 5.2 缓解措施

1. **性能优化**：
   - 使用缓存机制
   - 优化转换逻辑
   - 性能基准测试

2. **兼容性保证**：
   - 保留原有API
   - 提供迁移指南
   - 逐步替换

3. **测试策略**：
   - 单元测试覆盖所有转换器
   - 集成测试覆盖所有使用场景
   - 回归测试确保功能正常

## 6. 总结

长期改进方案通过引入错误类型转换器，实现了：

1. **统一错误处理**：所有错误通过统一的转换流程
2. **类型安全**：完整的类型检查和类型守卫
3. **可扩展性**：易于添加新的转换器
4. **可维护性**：清晰的架构和职责分离
5. **可观测性**：完整的错误链追踪

建议优先实施方案二，在稳定运行后可以考虑引入方案一的中间件功能作为补充。