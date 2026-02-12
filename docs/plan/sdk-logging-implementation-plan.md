# SDK模块日志功能实施计划

## 1. 基础架构设计

### 1.1 包级别日志器创建
根据使用指南的推荐做法，SDK应该在包入口处创建包级别日志器：

```typescript
// sdk/index.ts
import { createPackageLogger } from '@modular-agent/common-utils/logger';

// 创建SDK包的主日志器
export const logger = createPackageLogger('sdk', { 
  level: process.env.SDK_LOG_LEVEL || 'info',
  json: process.env.NODE_ENV === 'production'
});
```

### 1.2 模块级别日志器组织
按照功能模块创建子日志器：

```typescript
// sdk/core/index.ts
import { logger as sdkLogger } from '../index';
export const logger = sdkLogger.child('core');

// sdk/api/index.ts  
import { logger as sdkLogger } from '../index';
export const logger = sdkLogger.child('api');

// sdk/core/services/index.ts
import { logger as coreLogger } from '../../core/index';
export const logger = coreLogger.child('services');
```

## 2. 核心模块日志集成

### 2.1 工作流执行日志
在工作流执行的关键节点添加日志：

```typescript
// sdk/core/execution/coordinators/workflow-execution-coordinator.ts
import { logger } from '../../../logger';

class WorkflowExecutionCoordinator {
  async execute(workflowId: string, context: ExecutionContext) {
    logger.info('Workflow execution started', { 
      workflowId, 
      threadId: context.getThreadId() 
    });
    
    try {
      // 执行逻辑
      const result = await this.executeWorkflow(workflowId, context);
      logger.info('Workflow execution completed', { 
        workflowId, 
        success: true,
        executionTime: Date.now() - startTime
      });
      return result;
    } catch (error) {
      logger.error('Workflow execution failed', { 
        workflowId, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

### 2.2 工具执行日志
在工具服务中集成日志功能：

```typescript
// sdk/core/services/tool-service.ts
import { logger } from '../../logger';

class ToolService {
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadContext?: ThreadContext
  ): Promise<ToolExecutionResult> {
    const toolLogger = logger.child('tool-execution', { toolName });
    
    toolLogger.debug('Tool execution started', { parameters });
    
    try {
      const tool = this.getTool(toolName);
      const executor = this.executors.get(tool.type);
      
      if (!executor) {
        const errorMsg = `No executor found for tool type '${tool.type}'`;
        toolLogger.error('Tool executor not found', { toolType: tool.type });
        throw new ToolError(errorMsg, toolName, tool.type);
      }
      
      const result = await executor.execute(tool, parameters, options, threadContext);
      toolLogger.info('Tool execution completed', { 
        success: result.success,
        executionTime: result.executionTime,
        retryCount: result.retryCount
      });
      
      return result;
    } catch (error) {
      toolLogger.error('Tool execution failed', { 
        error: error.message,
        parameters: Object.keys(parameters) // 避免记录敏感参数
      });
      throw error;
    }
  }
}
```

### 2.3 API层日志
在API层添加请求/响应日志：

```typescript
// sdk/api/core/sdk.ts
import { logger } from '../../logger';

export class ModularAgentSDK {
  private apiLogger = logger.child('api');
  
  async executeWorkflow(workflowId: string, options?: ExecutionOptions) {
    const startTime = Date.now();
    this.apiLogger.info('API call received', { 
      method: 'executeWorkflow',
      workflowId,
      options: this.sanitizeOptions(options)
    });
    
    try {
      const result = await this.workflowExecutor.execute(workflowId, options);
      this.apiLogger.info('API call completed', { 
        method: 'executeWorkflow',
        workflowId,
        success: true,
        executionTime: Date.now() - startTime
      });
      return result;
    } catch (error) {
      this.apiLogger.error('API call failed', { 
        method: 'executeWorkflow',
        workflowId,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    }
  }
  
  private sanitizeOptions(options?: ExecutionOptions) {
    // 移除敏感信息，只保留配置结构
    if (!options) return undefined;
    return {
      timeout: options.timeout,
      retries: options.retries,
      cache: options.cache,
      logging: options.logging,
      validation: options.validation
    };
  }
}
```

## 3. 配置驱动的日志控制

### 3.1 日志级别动态配置
利用现有的配置选项控制日志行为：

```typescript
// sdk/api/core/sdk-api-dependencies.ts
import { setGlobalLogLevel, getGlobalLogger } from '@modular-agent/common-utils/logger';
import { logger } from '../../logger';

export class SDKAPIDependencies {
  constructor(config: SDKOptions = {}) {
    // 根据配置设置全局日志级别
    if (config.enableLogging === false) {
      setGlobalLogLevel('off');
    } else {
      // 可以从环境变量或配置中读取更详细的日志级别
      const logLevel = process.env.SDK_LOG_LEVEL || 'info';
      setGlobalLogLevel(logLevel as any);
    }
    
    // 记录SDK初始化日志
    logger.info('SDK initialized', { 
      enableLogging: config.enableLogging !== false,
      logLevel: getGlobalLogger().getLevel()
    });
  }
}
```

### 3.2 执行选项中的日志控制
在执行选项中控制特定操作的日志输出：

```typescript
// sdk/api/operations/commands/tools/execute-tool-command.ts
import { logger } from '../../../logger';

export class ExecuteToolCommand extends BaseCommand<ToolExecutionResult> {
  protected async executeInternal(): Promise<ToolExecutionResult> {
    const commandLogger = logger.child('execute-tool-command');
    
    // 检查是否启用日志
    const enableLogging = this.options?.enableLogging ?? true;
    if (!enableLogging) {
      // 临时禁用日志输出
      const originalLevel = commandLogger.getLevel();
      commandLogger.setLevel('off');
    }
    
    try {
      const startTime = Date.now();
      commandLogger.debug('ExecuteToolCommand started', { 
        toolName: this.toolName,
        parameters: Object.keys(this.parameters)
      });
      
      // ... 执行逻辑
      
      const executionTime = Date.now() - startTime;
      commandLogger.info('ExecuteToolCommand completed', { 
        toolName: this.toolName,
        executionTime,
        success: true
      });
      
      return executionResult;
    } finally {
      // 恢复原始日志级别
      if (!enableLogging) {
        commandLogger.setLevel(originalLevel);
      }
    }
  }
}
```

## 4. 高级日志功能

### 4.1 多目标输出配置
为不同环境配置不同的日志输出：

```typescript
// sdk/config/logger-config.ts
import { 
  createConsoleStream, 
  createFileStream, 
  createMultistream,
  createAsyncStream
} from '@modular-agent/common-utils/logger';

export function createSDKLoggerStream() {
  const streams = [];
  
  // 开发环境：彩色console输出
  if (process.env.NODE_ENV !== 'production') {
    streams.push({
      stream: createConsoleStream({ 
        pretty: true,
        json: false 
      }),
      level: 'debug'
    });
  }
  
  // 生产环境：JSON格式文件输出
  if (process.env.NODE_ENV === 'production') {
    const fileStream = createAsyncStream(
      createFileStream({ 
        filePath: process.env.SDK_LOG_FILE || './logs/sdk.log',
        json: true,
        append: true
      }),
      { batchSize: 50 }
    );
    
    streams.push({
      stream: fileStream,
      level: 'info'
    });
    
    // 错误日志单独存储
    const errorFileStream = createAsyncStream(
      createFileStream({ 
        filePath: process.env.SDK_ERROR_LOG_FILE || './logs/sdk-error.log',
        json: true,
        append: true
      })
    );
    
    streams.push({
      stream: errorFileStream,
      level: 'error'
    });
  }
  
  if (streams.length === 0) {
    // 默认console输出
    return createConsoleStream();
  }
  
  return createMultistream(streams);
}
```

### 4.2 性能监控日志
添加性能相关的日志指标：

```typescript
// sdk/core/execution/performance-monitor.ts
import { logger } from '../../logger';

export class PerformanceMonitor {
  private perfLogger = logger.child('performance');
  
  logExecutionMetrics(metrics: {
    component: string;
    operation: string;
    duration: number;
    memoryUsage?: number;
    [key: string]: any;
  }) {
    this.perfLogger.info('Performance metrics', metrics);
  }
  
  logCacheHit(component: string, key: string) {
    this.perfLogger.debug('Cache hit', { component, key });
  }
  
  logCacheMiss(component: string, key: string) {
    this.perfLogger.warn('Cache miss', { component, key });
  }
}
```

## 5. 迁移现有console.log

### 5.1 替换现有的console.log调用
将现有的简单日志输出替换为正式的日志系统：

```typescript
// Before: sdk/core/execution/handlers/hook-handlers/hook-handler.ts
console.log(`Hook triggered for event "${hook.eventName}" on node "${context.node.id}"`);

// After:
import { logger } from '../../../logger';
const hookLogger = logger.child('hook-handler');

hookLogger.debug('Hook triggered', { 
  eventName: hook.eventName,
  nodeId: context.node.id,
  hookType: hook.hookType
});
```

```typescript
// Before: sdk/api/core/sdk.ts  
console.log('SDK实例已销毁');

// After:
import { logger } from '../../logger';
logger.info('SDK instance destroyed');
```

## 6. 测试和验证

### 6.1 日志功能测试
创建专门的日志功能测试：

```typescript
// sdk/tests/logging-integration.test.ts
import { createLogger, createNoopLogger, setGlobalLogger } from '@modular-agent/common-utils/logger';
import { logger } from '../logger';

describe('Logging Integration', () => {
  beforeEach(() => {
    // 重置全局日志器
    setGlobalLogger(createLogger({ level: 'debug' }));
  });
  
  it('should log workflow execution events', async () => {
    const testLogger = createLogger({ level: 'debug' });
    // Mock logger to capture logs
    const logs: any[] = [];
    const originalWrite = testLogger['stream'].write;
    testLogger['stream'].write = (entry) => {
      logs.push(entry);
      originalWrite.call(testLogger['stream'], entry);
    };
    
    // 执行工作流
    await executeTestWorkflow();
    
    // 验证日志
    expect(logs.some(log => log.message.includes('Workflow execution started'))).toBe(true);
    expect(logs.some(log => log.message.includes('Workflow execution completed'))).toBe(true);
  });
  
  it('should respect logging configuration', async () => {
    // 禁用日志
    setGlobalLogger(createNoopLogger());
    
    const logs: any[] = [];
    const originalConsoleLog = console.log;
    console.log = (msg) => logs.push(msg);
    
    await executeTestWorkflow();
    
    // 应该没有日志输出
    expect(logs.length).toBe(0);
    
    console.log = originalConsoleLog;
  });
});
```

## 7. 实施优先级

### 7.1 第一阶段：基础集成
- [ ] 在sdk/index.ts中创建包级别日志器
- [ ] 在核心模块中创建子日志器
- [ ] 替换现有的console.log调用
- [ ] 在工作流执行器中添加基本日志

### 7.2 第二阶段：完整覆盖
- [ ] 在工具服务中集成日志
- [ ] 在API层添加请求/响应日志
- [ ] 实现配置驱动的日志控制
- [ ] 添加错误处理日志

### 7.3 第三阶段：高级功能
- [ ] 实现多目标日志输出
- [ ] 添加性能监控日志
- [ ] 创建日志功能测试
- [ ] 文档化日志使用规范

## 8. 环境变量配置

### 8.1 支持的环境变量
```bash
# 日志级别控制
SDK_LOG_LEVEL=debug|info|warn|error|off

# 生产环境日志文件路径
SDK_LOG_FILE=./logs/sdk.log
SDK_ERROR_LOG_FILE=./logs/sdk-error.log

# 是否启用JSON格式（生产环境默认启用）
SDK_LOG_JSON=true|false

# 是否启用异步日志（高并发场景）
SDK_LOG_ASYNC=true|false
SDK_LOG_BATCH_SIZE=50
```

### 8.2 默认配置
```typescript
const DEFAULT_LOGGER_CONFIG = {
  level: process.env.SDK_LOG_LEVEL || 'info',
  json: process.env.SDK_LOG_JSON !== 'false' && process.env.NODE_ENV === 'production',
  async: process.env.SDK_LOG_ASYNC === 'true',
  batchSize: parseInt(process.env.SDK_LOG_BATCH_SIZE || '20'),
  filePath: process.env.SDK_LOG_FILE || './logs/sdk.log'
};
```

## 9. 最佳实践

### 9.1 日志消息规范
- **信息级别**：记录重要的业务事件（工作流开始/结束、工具调用等）
- **警告级别**：记录潜在问题（缓存未命中、重试等）
- **错误级别**：记录异常和失败情况
- **调试级别**：记录详细的执行信息（参数、中间状态等）

### 9.2 上下文信息规范
- 始终包含相关的ID（workflowId、threadId、toolName等）
- 避免记录敏感信息（密码、token等）
- 使用结构化对象而不是字符串拼接
- 保持上下文信息的一致性

### 9.3 性能考虑
- 在热路径中谨慎使用调试日志
- 使用异步日志输出避免阻塞主线程
- 合理设置日志级别，生产环境避免过多调试日志
- 使用批量处理提高日志写入性能